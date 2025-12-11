import React, { useState } from 'react';
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

  const [isBlooming, setIsBlooming] = useState(false);
  const [isHandPresent, setHandPresent] = useState(false);

  return (
    <div className="relative w-full h-full bg-black">
      <SceneContainer config={config} isBlooming={isBlooming} isHandPresent={isHandPresent} />
      <UIOverlay config={config} setConfig={setConfig} />
      <HandTracker onBloomChange={setIsBlooming} onPresenceChange={setHandPresent} />
    </div>
  );
};

export default App;