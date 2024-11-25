import React, { useEffect, useState, useRef } from 'react';
import { Brain, Volume2, Mic, Activity } from 'lucide-react';
import { AudioVisualizer } from './components/AudioVisualizer';
import { NeuralNetworkViz } from './components/NeuralNetworkViz';
import { ClusteringViz } from './components/ClusteringViz';
import { useAudioCapture } from './hooks/useAudioCapture';
import { AnimatedMicrophone } from './components/AnimatedMicrophone';
import { AudioFeatures } from './components/AudioFeatures';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    audioData,
    spectrumData,
    mfccData,
    pitchData,
    loudnessData,
    startCapture,
    isCapturing,
    vadStatus
  } = useAudioCapture();
  const [timestamp, setTimestamp] = useState(Date.now());

  useEffect(() => {
    startCapture();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(Date.now());
    }, 1000 / 48); // 48fps

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              <AnimatedMicrophone />
            </div>
            <div className="h-16 flex-1 overflow-hidden">
              {audioData && <AudioVisualizer data={audioData} />}
            </div>
          </div>
          <AudioFeatures
            spectrumData={spectrumData ? Array.from(spectrumData) : []}
            mfccData={mfccData || []}
            pitchData={pitchData}
            loudnessData={loudnessData}
          />
        </div>

        <NeuralNetworkViz isProcessing={isProcessing} />
        {vadStatus && (
          <ClusteringViz
            mfccData={mfccData || []}
            pitchData={pitchData}
            loudnessData={loudnessData}
            timestamp={timestamp}
            vadStatus={vadStatus}
          />
        )}
      </div>
    </div>
  );
}

export default App;