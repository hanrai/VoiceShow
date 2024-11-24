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
  const { audioData, startCapture, isCapturing } = useAudioCapture();

  // 添加音频特征数据的状态
  const [spectrumData, setSpectrumData] = useState<number[]>([]);
  const [mfccData, setMfccData] = useState<number[]>([]);
  const [pitchData, setPitchData] = useState<number[]>([]);
  const [loudnessData, setLoudnessData] = useState<number[]>([]);

  // 移除 startCapture 的依赖
  useEffect(() => {
    startCapture();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 使用 useRef 来跟踪上一次的音频数据
  const lastAudioDataRef = useRef<Float32Array | null>(null);

  // 直接监听 audioData 的变化
  useEffect(() => {
    // 检查数据是否真的变化了
    if (!audioData || audioData === lastAudioDataRef.current) return;
    lastAudioDataRef.current = audioData;

    // 直接更新特征数据
    setSpectrumData(Array(128).fill(0).map(() => Math.random() * 100 - 100));
    setMfccData(Array(64).fill(0).map(() => Math.random() * 160 - 80));
    setPitchData([Math.random() * 1980 + 20]);
    setLoudnessData([Math.random() * 60 - 60]);
  }, [audioData]); // 只依赖 audioData

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
            spectrumData={spectrumData}
            mfccData={mfccData}
            pitchData={pitchData}
            loudnessData={loudnessData}
          />
        </div>

        <NeuralNetworkViz isProcessing={isProcessing} />
        <ClusteringViz isProcessing={isProcessing} />
      </div>
    </div>
  );
}

export default App;