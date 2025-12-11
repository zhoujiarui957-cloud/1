import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import LotusParticles from './LotusParticles';
import { LotusConfig } from '../types';

interface SceneContainerProps {
  config: LotusConfig;
  isBlooming: boolean;
  isHandPresent: boolean;
}

const SceneContainer: React.FC<SceneContainerProps> = ({ config, isBlooming, isHandPresent }) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 4, 10], fov: 40 }} 
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#050002']} /> 
        
        {/* Ambient warmth */}
        <ambientLight intensity={0.1} color="#330011" />
        
        {/* Lights adjusted for Pink/Gold theme */}
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff99cc" />
        <pointLight position={[-10, 5, -10]} intensity={1.2} color="#ff0066" />
        <pointLight position={[0, -10, 0]} intensity={0.8} color="#ffcc00" /> 

        <Suspense fallback={null}>
          <LotusParticles config={config} isBlooming={isBlooming} isHandPresent={isHandPresent} />
          
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