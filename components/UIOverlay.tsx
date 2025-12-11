import React from 'react';
import { LotusConfig } from '../types';

interface UIOverlayProps {
  config: LotusConfig;
  setConfig: React.Dispatch<React.SetStateAction<LotusConfig>>;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ config, setConfig }) => {
  const handleChange = (key: keyof LotusConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="absolute top-0 left-0 w-full p-6 pointer-events-none flex flex-col justify-between h-full">
      <div className="text-white">
        <h1 className="text-4xl font-thin tracking-widest uppercase mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-rose-500 drop-shadow-[0_0_15px_rgba(255,0,100,0.6)]">
          Mystic Lotus
        </h1>
        <p className="text-sm text-pink-200 opacity-80 font-light tracking-wide max-w-md">
          Procedural Particle Artifact
        </p>
      </div>

      <div className="pointer-events-auto bg-black/60 backdrop-blur-md border border-pink-500/20 p-6 rounded-lg w-full max-w-sm ml-auto sm:ml-0 shadow-[0_0_20px_rgba(255,0,100,0.1)]">
        <h2 className="text-pink-100/90 text-sm font-bold uppercase tracking-widest mb-4 border-b border-pink-500/30 pb-2">
          Configuration
        </h2>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-pink-100 mb-1">
              <span>Rotation Speed</span>
              <span>{config.rotationSpeed.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.rotationSpeed}
              onChange={(e) => handleChange('rotationSpeed', parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-pink-100 mb-1">
              <span>Bloom Intensity</span>
              <span>{config.bloomIntensity.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={config.bloomIntensity}
              onChange={(e) => handleChange('bloomIntensity', parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
            />
          </div>

          <div>
             <div className="flex justify-between text-xs text-pink-100 mb-1">
              <span>Particle Size</span>
              <span>{config.particleSize.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.1"
              step="0.005"
              value={config.particleSize}
              onChange={(e) => handleChange('particleSize', parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;