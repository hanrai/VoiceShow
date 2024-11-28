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
  mfccData = [],
  pitchData = 0,
  loudnessData = 0,
  vadStatus
}) => {
  // 确保所有数据都有有效的默认值
  const safeSpectrumData = spectrumData || new Float32Array();
  const safeMfccData = mfccData.length > 0 ? mfccData : new Array(13).fill(0);

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
      <div className="grid grid-cols-1 gap-3 mt-2 px-2 max-w-[2000px] mx-auto">
        {/* MFCC图 */}
        <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden h-16 shadow-lg">
          <div className="absolute top-1.5 left-2 flex items-center gap-1 z-10">
            <span className="text-xs font-medium text-white/80">MFCC</span>
          </div>
          <ScrollingVisualizer
            data={safeMfccData}
            height={64}
            renderType="heatmap"
            minValue={-0.2}
            maxValue={0.2}
            backgroundColor="transparent"
          />
        </div>

        {/* 音高图 */}
        <div className="relative bg-gradient-to-r from-blue-900/50 to-blue-800/30 rounded-xl overflow-hidden h-16 shadow-lg">
          <div className="absolute top-1.5 left-2 flex items-center gap-1 z-10">
            <span className="text-xs font-medium text-white/80">音高</span>
          </div>
          <ScrollingVisualizer
            data={Array.from(safeSpectrumData)}
            height={64}
            renderType="spectrumWithPitch"
            minValue={-100}
            maxValue={0}
            maxFreq={2000}
            backgroundColor="transparent"
            color="rgba(96, 165, 250, 0.8)"
            dominantFreq={trackDominantFrequency(safeSpectrumData)}
            smoothingFactor={0.15}
            threshold={-60}
            clearBeforeDraw={true}
          />
        </div>

        {/* 总能量 */}
        <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden h-16 shadow-lg">
          <div className="absolute top-1.5 left-2 flex items-center gap-1 z-10">
            <span className="text-xs font-medium text-white/80">总能量</span>
            <span className="text-[10px] text-white/50 ml-1">
              {calculateTotalEnergy(safeSpectrumData).toFixed(1)} dB
            </span>
          </div>
          <ScrollingVisualizer
            data={[calculateTotalEnergy(safeSpectrumData)]}
            height={64}
            color="rgba(52, 211, 153, 0.8)"
            renderType="line"
            minValue={-80}
            maxValue={-20}
            backgroundColor="transparent"
            smoothingFactor={0.1}
            displayUnit="dB"
            isEnergy={true}
          />
        </div>

        {/* Loudness */}
        <div className="relative bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden h-16 shadow-lg">
          <div className="absolute top-1.5 left-2 flex items-center gap-1 z-10">
            <span className="text-xs font-medium text-white/80">Loudness</span>
            <span className="text-[10px] text-white/50 ml-1">
              {loudnessData.toFixed(1)} dB
            </span>
          </div>
          <ScrollingVisualizer
            data={[loudnessData]}
            height={64}
            color="rgba(52, 211, 153, 0.8)"
            renderType="line"
            minValue={-60}
            maxValue={0}
            backgroundColor="transparent"
            smoothingFactor={0.1}
            displayUnit="dB"
            isEnergy={true}
          />
        </div>
      </div>
    </div>
  );
}; 