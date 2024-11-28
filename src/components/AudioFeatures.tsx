import React, { useEffect } from 'react';
import { ScrollingVisualizer } from './ScrollingVisualizer';
import { AudioVisualizer } from './AudioVisualizer';
import { Activity } from 'lucide-react';

interface AudioFeaturesProps {
  waveformData?: number[];
  spectrumData: Float32Array | null;
  mfccData: number[];
  pitchData: number;
  loudnessData: number;
  vadStatus: boolean;
}

// 添加主频率追踪函数
const trackDominantFrequency = (spectrum: Float32Array | null): number | null => {
  if (!spectrum?.length) return null;

  const sampleRate = 48000;
  const binSize = sampleRate / (2 * spectrum.length);
  const minFreqBin = Math.floor(80 / binSize);
  const maxFreqBin = Math.floor(1000 / binSize);

  // 添加能量阈值
  const energyThreshold = -60; // dB

  let maxEnergy = -Infinity;
  let dominantBin = -1;

  // 在目标频率范围内寻找能量最高点
  for (let i = minFreqBin; i < maxFreqBin; i++) {
    if (spectrum[i] > energyThreshold && spectrum[i] > maxEnergy) {
      maxEnergy = spectrum[i];
      dominantBin = i;
    }
  }

  if (dominantBin === -1) return null;

  return dominantBin * binSize;
};

export const AudioFeatures: React.FC<AudioFeaturesProps> = ({
  waveformData = [],
  spectrumData,
  mfccData,
  pitchData,
  loudnessData,
  vadStatus
}) => {
  // 在组件内部，将单个数值转换为数组进行显示
  const pitchArray = [pitchData];
  const loudnessArray = [loudnessData];

  // 修改总能量计算函数以支持两种类型
  const calculateTotalEnergy = (spectrum: Float32Array | null): number => {
    if (!spectrum?.length) return -100;

    const values = Array.from(spectrum);
    const validValues = values.filter(value =>
      !isNaN(value) && isFinite(value) && value > -100
    );

    if (validValues.length === 0) return -100;

    return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 mt-1 px-1 max-w-[2000px] mx-auto">
        {/* MFCC图 */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          <div className="absolute top-0.5 left-0.5 flex items-center gap-1 z-10 text-xs text-white/60 bg-black/30 px-1 py-0.5 rounded">
            <Activity className="w-3 h-3" />
            <span>MFCC</span>
          </div>
          <ScrollingVisualizer
            data={mfccData}
            height={80}
            renderType="heatmap"
            minValue={-0.2}
            maxValue={0.2}
            backgroundColor="#1a1a1a"
          />
        </div>

        {/* 音高图 */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          <div className="absolute top-0.5 left-0.5 flex items-center gap-1 z-10 text-xs text-white/60 bg-black/30 px-1 py-0.5 rounded">
            <Activity className="w-3 h-3" />
            <span>音高</span>
          </div>
          <ScrollingVisualizer
            data={Array.from(spectrumData || new Float32Array())}
            height={120}
            renderType="spectrumWithPitch"
            minValue={-100}
            maxValue={0}
            maxFreq={2000}
            backgroundColor="#1a1a1a"
            color="#60A5FA"
            dominantFreq={trackDominantFrequency(spectrumData)}
            smoothingFactor={0.15}
            threshold={-60}
            clearBeforeDraw={true}
          />
        </div>

        {/* 总能量 */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          <div className="absolute top-1 left-1 flex items-center gap-1 z-10 text-xs text-white/60 bg-black/30 px-1.5 py-0.5 rounded">
            <Activity className="w-3 h-3" />
            <span>总能量</span>
          </div>
          <ScrollingVisualizer
            data={[calculateTotalEnergy(spectrumData)]}
            height={120}
            color="#34D399"
            renderType="line"
            minValue={-80}
            maxValue={-20}
            backgroundColor="#1a1a1a"
            smoothingFactor={0.1}
            displayUnit="dB"
            isEnergy={true}
          />
        </div>

        {/* Loudness */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden">
          <div className="absolute top-1 left-1 flex items-center gap-1 z-10 text-xs text-white/60 bg-black/30 px-1.5 py-0.5 rounded">
            <Activity className="w-3 h-3" />
            <span>Loudness</span>
          </div>
          <ScrollingVisualizer
            data={loudnessArray}
            height={120}
            renderType="line"
            minValue={-60}
            maxValue={0}
            color="#34D399"
            backgroundColor="#1a1a1a"
            smoothingFactor={0.1}
            displayUnit="dB"
            isEnergy={true}
          />
        </div>
      </div>
    </div>
  );
}; 