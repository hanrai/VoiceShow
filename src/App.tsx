import React, { useEffect, useState, useRef } from 'react';
import { Brain, Volume2, Mic, Activity } from 'lucide-react';
import { AudioVisualizer } from './components/AudioVisualizer';
import { NeuralNetworkViz } from './components/NeuralNetworkViz';
import { useAudioCapture } from './hooks/useAudioCapture';
import { AnimatedMicrophone } from './components/AnimatedMicrophone';
import { AudioFeatures } from './components/AudioFeatures';
import { CoughVAD } from './components/CoughVAD';
import { CoughVisualization } from './components/CoughVisualization';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollingVisualizer } from './components/ScrollingVisualizer';
import { AudioEvent } from './components/CoughVAD';

function App() {
  const [features, setFeatures] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<AudioEvent | null>(null);
  const [eventConfidences, setEventConfidences] = useState<{ type: AudioEvent['type']; confidence: number; }[]>([
    { type: 'cough', confidence: 0 },
    { type: 'speech', confidence: 0 },
    { type: 'noise', confidence: 0 },
    { type: 'laugh', confidence: 0 },
    { type: 'sneeze', confidence: 0 },
    { type: 'breath', confidence: 0 }
  ]);

  const {
    audioData,
    spectrumData,
    mfccData,
    pitchData,
    loudnessData,
    startCapture,
    isCapturing,
    vadStatus,
    error
  } = useAudioCapture();

  // 更新事件置信度
  const updateEventConfidence = (event: AudioEvent) => {
    setEventConfidences(prev =>
      prev.map(ec =>
        ec.type === event.type
          ? { ...ec, confidence: event.confidence }
          : { ...ec, confidence: Math.max(0, ec.confidence - 0.1) } // 其他事件的置信度逐渐衰减
      )
    );
  };

  useEffect(() => {
    startCapture();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {error && (
        <div className="fixed top-[env(safe-area-inset-top)] left-0 right-0 bg-red-500 text-white p-2 text-center z-50">
          <p className="text-lg font-semibold">{error}</p>
          <button
            onClick={startCapture}
            className="mt-1 px-4 py-1 bg-white text-red-500 rounded hover:bg-red-100 transition-colors"
          >
            重试
          </button>
        </div>
      )}
      <div className="max-w-[2400px] mx-auto p-1 pb-[90px] pt-[env(safe-area-inset-top)]">
        <div className="bg-gray-800 rounded-lg p-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <AnimatedMicrophone />
            </div>
            <div className="h-12 flex-1 overflow-hidden">
              {spectrumData && (
                <ScrollingVisualizer
                  data={Array.from(spectrumData)}
                  height={48}
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
            spectrumData={spectrumData}
            mfccData={mfccData || []}
            pitchData={pitchData || 0}
            loudnessData={loudnessData || 0}
            vadStatus={vadStatus}
          />
        </div>

        <div className="w-full max-w-[2400px] mx-auto mb-2">
          <NeuralNetworkViz
            isProcessing={isProcessing}
            mfccData={mfccData || []}
          />
        </div>

        {audioData && (
          <CoughVAD
            audioData={audioData}
            onVADResult={(event) => {
              console.log('Audio event detected:', event);
              setCurrentEvent(event);
              updateEventConfidence(event);
              setIsProcessing(false);
            }}
            onFeatures={(features) => {
              setFeatures(features);
              setIsProcessing(true);
            }}
          />
        )}
      </div>

      <ErrorBoundary>
        <div className="visualization-container">
          <CoughVisualization
            features={features}
            isProcessing={isProcessing}
            currentEvent={currentEvent}
            eventConfidences={eventConfidences}
          />
        </div>
      </ErrorBoundary>
    </div>
  );
}

export default App;