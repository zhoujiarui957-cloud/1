import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import LotusParticles from './LotusParticles';
import { LotusConfig } from '../types';
import * as THREE from 'three';

interface SceneContainerProps {
  config: LotusConfig;
  isBlooming: boolean;
  isHandPresent: boolean;
  activeColor: string;
}

const SceneContainer: React.FC<SceneContainerProps> = ({ config, isBlooming, isHandPresent, activeColor }) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 4, 10], fov: 40 }} 
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#050002']} /> 
        
        {/* Dynamic lighting based on active color */}
        <ambientLight intensity={0.1} color={activeColor} />
        
        <pointLight position={[10, 10, 10]} intensity={1.5} color={activeColor} />
        <pointLight position={[-10, 5, -10]} intensity={1.2} color="white" />
        <pointLight position={[0, -10, 0]} intensity={0.8} color={activeColor} /> 

        <Suspense fallback={null}>
          <LotusParticles 
            config={config} 
            isBlooming={isBlooming} 
            isHandPresent={isHandPresent}
            activeColor={activeColor}
          />
          
          {/* Subtle background stars */}
          <Stars radius={100} depth={50} count={3000} factor={4} saturation={0.5} fade speed={0.5} />

          <EffectComposer disableNormalPass>
            <Bloom 
                luminanceThreshold={0.15} 
                mipmapBlur 
                intensity={config.bloomIntensity} 
                radius={0.7}
                levels={8}
            />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>

        <OrbitControls 
          enablePan={false} 
          minDistance={2} 
          maxDistance={25} 
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export default SceneContainer;