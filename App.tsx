import React, { useState, useCallback } from 'react';
import SceneContainer from './components/SceneContainer';
import UIOverlay from './components/UIOverlay';
import HandTracker from './components/HandTracker';
import { LotusConfig } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<LotusConfig>({
    petalCount: 80000,
    layers: 4,
    particleSize: 0.06,
    rotationSpeed: 0.1,
    bloomIntensity: 1.5,
  });

  // Palette: Light Pink, Blue, Yellow, Purple
  const PALETTE = [
    '#ffa6c9', // Light Pink
    '#0088ff', // Blue
    '#ffcc00', // Yellow
    '#9900ff', // Purple
  ];

  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [isBlooming, setIsBlooming] = useState(false);
  const [isHandPresent, setHandPresent] = useState(false);

  const handleSwipe = useCallback(() => {
    setActiveColor(prev => {
      // Pick a random color distinct from the current one
      const available = PALETTE.filter(c => c !== prev);
      const random = available[Math.floor(Math.random() * available.length)];
      return random;
    });
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      <SceneContainer 
        config={config} 
        isBlooming={isBlooming} 
        isHandPresent={isHandPresent} 
        activeColor={activeColor}
      />
      <UIOverlay config={config} setConfig={setConfig} />
      <HandTracker 
        onBloomChange={setIsBlooming} 
        onPresenceChange={setHandPresent} 
        onSwipe={handleSwipe}
      />
    </div>
  );
};

export default App;