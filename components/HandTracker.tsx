import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

interface HandTrackerProps {
  onBloomChange: (isBlooming: boolean) => void;
  onPresenceChange: (isPresent: boolean) => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onBloomChange, onPresenceChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number>(0);
  const landmarkerRef = useRef<HandLandmarker | null>(null);

  useEffect(() => {
    let mounted = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        
        if (!mounted) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        if (!mounted) return;
        landmarkerRef.current = landmarker;
        startWebcam();
      } catch (err: any) {
        console.error(err);
        setError("Failed to load AI model");
        setLoading(false);
      }
    };

    const startWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 320, height: 240, frameRate: 30 } 
            });
            
            if (videoRef.current && mounted) {
                videoRef.current.srcObject = stream;
                videoRef.current.addEventListener('loadeddata', () => {
                   setLoading(false);
                   predict();
                });
            }
        } catch (err) {
            console.error(err);
            setError("Camera access denied");
            setLoading(false);
        }
    };

    setupMediaPipe();

    return () => {
      mounted = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      cancelAnimationFrame(requestRef.current);
      landmarkerRef.current?.close();
    };
  }, []);

  const predict = () => {
    if (landmarkerRef.current && videoRef.current && videoRef.current.readyState >= 2) {
        const nowInMs = Date.now();
        if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = videoRef.current.currentTime;
            
            const result = landmarkerRef.current.detectForVideo(videoRef.current, nowInMs);
            
            if (result.landmarks && result.landmarks.length > 0) {
                setHandDetected(true);
                onPresenceChange(true); // Notify hand is present

                const landmarks = result.landmarks[0];
                
                // --- OPEN/CLOSE LOGIC ---
                // We check if fingers are extended by comparing distance of tip to wrist 
                // vs distance of PIP (knuckle) to wrist.
                
                const wrist = landmarks[0];
                const fingers = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky tips
                const pips = [6, 10, 14, 18];    // Corresponding PIP joints
                
                let extendedCount = 0;
                
                const dist = (p1: any, p2: any) => Math.sqrt(
                    Math.pow(p1.x - p2.x, 2) + 
                    Math.pow(p1.y - p2.y, 2) + 
                    Math.pow(p1.z - p2.z, 2)
                );

                for (let i = 0; i < 4; i++) {
                    const dTip = dist(wrist, landmarks[fingers[i]]);
                    const dPip = dist(wrist, landmarks[pips[i]]);
                    
                    // If tip is significantly further from wrist than the knuckle is, it's extended
                    if (dTip > dPip) {
                        extendedCount++;
                    }
                }

                // If 3 or more fingers are extended, we consider it OPEN (Bloom)
                const isHandOpen = extendedCount >= 3;
                onBloomChange(isHandOpen);
            } else {
                // No hand detected -> Closed (Bud) and Not Present
                setHandDetected(false);
                onPresenceChange(false);
                onBloomChange(false);
            }
        }
    }
    requestRef.current = requestAnimationFrame(predict);
  };

  if (error) {
    return (
        <div className="absolute bottom-4 right-4 bg-red-900/80 text-white p-2 rounded text-xs border border-red-500">
            {error}. Using Auto-Mode.
        </div>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 flex flex-col items-end pointer-events-none">
        <div className={`relative overflow-hidden rounded-lg border-2 transition-colors duration-300 ${handDetected ? 'border-pink-500' : 'border-gray-700'}`}>
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-32 h-24 object-cover transform scale-x-[-1] opacity-80" // Mirror effect
            />
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <div className="absolute bottom-1 right-1 px-1 bg-black/60 text-[10px] text-white rounded">
                {handDetected ? "Hand Detected" : "No Hand"}
            </div>
        </div>
        <div className="mt-1 text-[10px] text-pink-300/70 font-mono">
           {handDetected ? "Control: OPEN/CLOSE" : "Show hand to gather particles"}
        </div>
    </div>
  );
};

export default HandTracker;