import React, { useEffect, useState, useRef } from 'react';
import { Brain, Volume2, Mic, Activity } from 'lucide-react';
import { AudioVisualizer } from './components/AudioVisualizer';
import { NeuralNetworkViz } from './components/NeuralNetworkViz';
import { ClusteringViz } from './components/ClusteringViz';
import { useAudioCapture } from './hooks/useAudioCapture';
import { AnimatedMicrophone } from './components/AnimatedMicrophone';
import { AudioFeatures } from './components/AudioFeatures';
import { CoughVAD } from './components/CoughVAD';
import { CoughVisualization } from './components/CoughVisualization';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollingVisualizer } from './components/ScrollingVisualizer';

function App() {
  const [features, setFeatures] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState(false);
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
    }, 1000 / 22); // 22fps

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
              {spectrumData && (
                <ScrollingVisualizer
                  data={Array.from(spectrumData)}
                  height={64}
                  renderType="spectrum"
                  minValue={-100}
                  maxValue={0}
                  maxFreq={8000}
                  useColormap={true}
                  highlightPeak={true}
                  backgroundColor="transparent"
                  color="#60A5FA"
                  clearBeforeDraw={true}
                />
              )}
            </div>
          </div>
          <AudioFeatures
            waveformData={audioData ? Array.from(audioData) : []}
            spectrumData={[]}
            mfccData={mfccData || []}
            pitchData={pitchData}
            loudnessData={loudnessData}
            vadStatus={vadStatus}
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

        {audioData && (
          <CoughVAD
            audioData={audioData}
            onVADResult={(result) => {
              setDetectionResult(result);
              setIsProcessing(false);
            }}
            onFeatures={(features) => {
              setFeatures(features);
              setIsProcessing(true);
            }}
          />
        )}

        <ErrorBoundary>
          <div className="visualization-container">
            <CoughVisualization
              features={features}
              isProcessing={isProcessing}
              detectionResult={detectionResult}
            />
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;