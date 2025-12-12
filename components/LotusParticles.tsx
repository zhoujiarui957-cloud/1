import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LotusConfig } from '../types';

interface LotusParticlesProps {
  config: LotusConfig;
  isBlooming: boolean;
  isHandPresent: boolean;
  activeColor: string;
}

// Custom Shader for the breathing particle lotus
const LotusShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: 0.0 }, // Set in component
    uBloomIntensity: { value: 1.0 },
    uBloomState: { value: 0.0 }, // Controlled by hand gesture: 0 = Closed, 1 = Open
    uFormState: { value: 0.0 }, // Controlled by hand presence: 0 = Chaos, 1 = Formed
  },
  vertexShader: `
    uniform float uTime;
    uniform float uSize;
    uniform float uBloomState;
    uniform float uFormState;
    
    // x: angleAroundCenter, y: maxOpenAngle, z: layerYOffset
    attribute vec3 aInfo; 
    attribute vec3 color;
    attribute vec3 aRandomPos; // Chaotic position for when no hand is present
    
    varying vec3 vColor;
    varying float vAlpha;

    void main() {
      vColor = color;
      vec3 flowerPos = position;

      // --- INTERACTIVE BLOOM ---
      // uBloomState varies from 0.0 (closed) to 1.0 (open)
      float cycle = smoothstep(0.0, 1.0, uBloomState);

      // Distinguish Aura particles (marked with maxOpenAngle = -1.0)
      bool isAura = aInfo.y < -0.5;

      if (!isAura) {
        // PETAL ANIMATION logic (Standard Flower)
        
        float targetAngle = aInfo.y;
        float closedAngle = targetAngle * 0.15;
        float currentAngle = mix(closedAngle, targetAngle, cycle);

        // 1. Rotation around Local X Axis (Opening/Closing)
        float c = cos(currentAngle);
        float s = sin(currentAngle);
        vec3 posRotatedX = vec3(
          flowerPos.x,
          flowerPos.y * c - flowerPos.z * s,
          flowerPos.y * s + flowerPos.z * c
        );

        // 2. Rotation around Global Y Axis
        float rotY = aInfo.x;
        float cy = cos(rotY);
        float sy = sin(rotY);
        
        flowerPos = vec3(
          posRotatedX.x * cy - posRotatedX.z * sy,
          posRotatedX.y + aInfo.z, 
          posRotatedX.x * sy + posRotatedX.z * cy
        );

        // Center the flower vertically
        flowerPos.y -= 1.5;

      } else {
        // AURA ANIMATION 
        flowerPos.y += sin(uTime * 0.5 + flowerPos.x * 2.0) * 0.3;
        flowerPos.x += cos(uTime * 0.3 + flowerPos.z) * 0.1;
      }

      // Gentle global "life" vibration for the flower form
      flowerPos.x += sin(uTime * 5.0 + flowerPos.y) * 0.005;

      // --- CHAOS vs ORDER LOGIC ---
      // Calculate chaotic position with some drift
      vec3 chaosPos = aRandomPos;
      chaosPos.x += sin(uTime * 0.4 + aInfo.x * 10.0) * 1.5;
      chaosPos.y += cos(uTime * 0.3 + aInfo.y * 10.0) * 1.5;
      chaosPos.z += sin(uTime * 0.5 + aInfo.z * 10.0) * 1.5;

      // Mix between Chaos and Order based on uFormState (0 to 1)
      float formFactor = smoothstep(0.0, 1.0, uFormState);
      vec3 finalPos = mix(chaosPos, flowerPos, formFactor);

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      
      // Size attenuation
      gl_PointSize = uSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
      
      // Alpha logic: 
      // When closed/chaos, slightly dimmer. When blooming, bright.
      vAlpha = 0.5 + 0.5 * cycle; 
      // Fade out slightly during chaos to avoid overwhelming screen
      vAlpha *= (0.6 + 0.4 * formFactor);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    uniform float uBloomIntensity;

    void main() {
      // Circular particle shape
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;

      // Soft Glow Gradient
      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 1.5);

      vec3 finalColor = vColor * uBloomIntensity;
      
      gl_FragColor = vec4(finalColor, strength * vAlpha);
    }
  `
};

// Helper to calculate a point on a petal surface (Upright/Unrotated state)
const calculatePetalShape = (
  u: number, 
  v: number, 
  layerIndex: number, 
  totalLayers: number, 
  target: THREE.Vector3
) => {
  const layerRatio = layerIndex / totalLayers;
  const scale = 2.5 + layerRatio * 4; 
  
  // -- REFINED MODELING FOR REFERENCE IMAGE --
  
  // Width Profile: Sharper sine for pointy tip
  const widthProfile = Math.sin(u * Math.PI);
  
  // Pointed Tip Logic:
  const taper = 1.0 - Math.pow(u, 3.0); 

  // Width (x)
  const width = (v - 0.5) * widthProfile * taper * scale * 0.9;

  // Height (y)
  const height = u * scale * 2.2;
  
  // Stereoscopic Depth (Cup Shape)
  const sideCurl = Math.pow(Math.abs(v - 0.5) * 2.0, 2.0) * u * 1.5;
  const lengthCurve = Math.sin(u * Math.PI * 0.4) * 1.0;
  
  const depth = (sideCurl + lengthCurve) * scale * 0.3;

  target.set(width, height, depth);
  
  // Calculate max open angle for this layer
  const maxOpenAngle = 0.2 + Math.pow(layerRatio, 1.5) * 1.5;
  
  return maxOpenAngle;
};

const LotusParticles: React.FC<LotusParticlesProps> = ({ config, isBlooming, isHandPresent, activeColor }) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const currentBloomRef = useRef(0.0); // Smooth lerp value for bloom
  const currentFormRef = useRef(0.0);  // Smooth lerp value for form (Chaos vs Order)

  const { positions, colors, infos, randoms } = useMemo(() => {
    const tempPos: number[] = [];
    const tempCol: number[] = [];
    const tempInfo: number[] = []; // [angleAroundCenter, maxOpenAngle, layerYOffset]
    const tempRand: number[] = []; // [randX, randY, randZ]
    const vec = new THREE.Vector3();

    // Layer definition - Dense center, wide outer
    const layersDef = [
      { count: 5, offset: 0 },
      { count: 8, offset: 0.5 },
      { count: 12, offset: 0.0 },
      { count: 18, offset: 0.3 },
      { count: 24, offset: 0.1 },
      { count: 32, offset: 0.4 }   
    ];

    // Dynamic Palette Generation based on activeColor
    const baseCol = new THREE.Color(activeColor);
    
    // Deep center color (darker version of base)
    const colDeep = baseCol.clone();
    colDeep.offsetHSL(0, 0, -0.4); 

    // Main color (the base)
    const colMain = baseCol.clone();

    // Light variation (lighter, slightly desaturated)
    const colLight = baseCol.clone();
    colLight.offsetHSL(0, -0.2, 0.3);

    // Tip highlight (White)
    const colTip = new THREE.Color('#ffffff');     
    
    // Gold accent (complementary or fixed gold depending on taste, let's keep it Gold for contrast)
    // Actually, let's shift hue slightly for "Gold" equivalent in other colors, or keep real Gold.
    // Real gold looks best as a universal accent.
    const colGold = new THREE.Color('#ffaa00');    

    const totalParticles = config.petalCount;
    // Calculate particles per petal roughly
    const totalPetals = layersDef.reduce((sum, l) => sum + l.count, 0);
    const particlesPerPetal = Math.floor(totalParticles / totalPetals);

    layersDef.forEach((layer, layerIdx) => {
      const petalsInLayer = layer.count;
      
      for (let p = 0; p < petalsInLayer; p++) {
        const angleStep = (Math.PI * 2) / petalsInLayer;
        const petalRotation = p * angleStep + layer.offset;
        const layerYOffset = -(layerIdx * 0.25); 

        // -- STRUCTURED VEIN GENERATION --
        const veins = 7; 
        const pointsPerVein = Math.floor(particlesPerPetal / veins);

        for (let vIdx = 0; vIdx < veins; vIdx++) {
            const vBase = (vIdx + 0.5) / veins; 
            
            for (let i = 0; i < pointsPerVein; i++) {
                let u = i / pointsPerVein;
                u += (Math.random() - 0.5) * 0.02;
                let v = vBase + (Math.random() - 0.5) * 0.05;

                u = Math.max(0, Math.min(1, u));
                v = Math.max(0, Math.min(1, v));

                const maxAngle = calculatePetalShape(u, v, layerIdx, layersDef.length, vec);

                tempPos.push(vec.x, vec.y, vec.z);
                tempInfo.push(petalRotation, maxAngle, layerYOffset);

                // Add random chaos position (spread across screen space)
                tempRand.push(
                    (Math.random() - 0.5) * 30, // x
                    (Math.random() - 0.5) * 20, // y
                    (Math.random() - 0.5) * 20  // z
                );

                // --- COLOR MIXING ---
                const mixColor = colDeep.clone();
                if (layerIdx === 0 && u < 0.3) {
                     mixColor.lerp(colGold, 0.8);
                } else {
                    if (u < 0.2) {
                        mixColor.lerp(colDeep, 0.8);
                    } else if (u < 0.6) {
                        mixColor.lerp(colMain, u); 
                    } else {
                        mixColor.lerp(colMain, 0.2);
                        mixColor.lerp(colLight, (u - 0.5) * 2.5);
                    }
                    if (u > 0.92) {
                        mixColor.lerp(colTip, 0.8);
                    }
                    if (Math.abs(v - 0.5) < 0.05) {
                        mixColor.lerp(colLight, 0.3);
                    }
                }
                
                tempCol.push(mixColor.r, mixColor.g, mixColor.b);
            }
        }
      }
    });

    // Aura Particles (Floating Pollen)
    const auraCount = 8000;
    for(let i=0; i<auraCount; i++) {
        const r = 2 + Math.random() * 8;
        const theta = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 10;
        
        tempPos.push(r * Math.cos(theta), y, r * Math.sin(theta));
        tempInfo.push(0, -1.0, 0); 
        
        // Aura randoms are also wide
        tempRand.push(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 40
        );
        
        const auraCol = Math.random() > 0.5 ? colLight : colMain;
        tempCol.push(auraCol.r * 0.6, auraCol.g * 0.6, auraCol.b * 0.6);
    }

    return {
      positions: new Float32Array(tempPos),
      colors: new Float32Array(tempCol),
      infos: new Float32Array(tempInfo),
      randoms: new Float32Array(tempRand)
    };
  }, [config.petalCount, activeColor]); // Re-calculate when color changes

  useFrame((state, delta) => {
    // Rotate the entire flower group
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * config.rotationSpeed;
    }
    
    // Smoothly interpolate bloom state based on hand interaction (Open/Close)
    const targetBloom = isBlooming ? 1.0 : 0.0;
    currentBloomRef.current = THREE.MathUtils.lerp(currentBloomRef.current, targetBloom, delta * 2.0);

    // Smoothly interpolate Form state based on hand presence (Chaos -> Order)
    const targetForm = isHandPresent ? 1.0 : 0.0;
    currentFormRef.current = THREE.MathUtils.lerp(currentFormRef.current, targetForm, delta * 1.5);

    // Update Uniforms
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      shaderRef.current.uniforms.uSize.value = config.particleSize;
      shaderRef.current.uniforms.uBloomState.value = currentBloomRef.current;
      shaderRef.current.uniforms.uFormState.value = currentFormRef.current;
      shaderRef.current.uniforms.uBloomIntensity.value = config.bloomIntensity;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aInfo"
          count={infos.length / 3}
          array={infos}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandomPos"
          count={randoms.length / 3}
          array={randoms}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        vertexShader={LotusShaderMaterial.vertexShader}
        fragmentShader={LotusShaderMaterial.fragmentShader}
        uniforms={LotusShaderMaterial.uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default LotusParticles;