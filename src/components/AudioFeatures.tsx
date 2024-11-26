import React from 'react';
import { ScrollingVisualizer } from './ScrollingVisualizer';
import { AudioVisualizer } from './AudioVisualizer';
import { Activity } from 'lucide-react';

interface AudioFeaturesProps {
  waveformData?: number[];
  spectrumData: number[];
  mfccData: number[];
  pitchData: number;
  loudnessData: number;
  vadStatus: boolean;
}

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

  // 修改频谱的总能量计算方法
  const calculateTotalEnergy = (spectrum: number[]): number => {
    if (!spectrum?.length) return 0;

    // 直接使用dB值计算平均能量
    const validValues = spectrum.filter(value =>
      !isNaN(value) && isFinite(value) && value > -100  // 过滤掉无效值和极小值
    );

    if (validValues.length === 0) return -100;  // 如果没有有效值，返回最小值

    // 计算平均能量（dB域）
    const avgEnergy = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;

    return avgEnergy;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {/* 波形图 */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <div className="absolute top-1 left-1 flex items-center gap-1 z-10 text-xs text-white/60 bg-black/30 px-1.5 py-0.5 rounded">
          <Activity className="w-3 h-3" />
          <span>波形</span>
        </div>
        <AudioVisualizer data={waveformData} type="waveform" />
      </div>

      {/* MFCC图 */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <div className="absolute top-1 left-1 flex items-center gap-1 z-10 text-xs text-white/60 bg-black/30 px-1.5 py-0.5 rounded">
          <Activity className="w-3 h-3" />
          <span>MFCC</span>
        </div>
        <ScrollingVisualizer
          data={mfccData}
          height={120}
          color="0"
          renderType="heatmap"
          minValue={-80}
          maxValue={80}
          backgroundColor="#1a1a1a"
        />
      </div>

      {/* 音高图 */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <div className="absolute top-1 left-1 flex items-center gap-1 z-10 text-xs text-white/60 bg-black/30 px-1.5 py-0.5 rounded">
          <Activity className="w-3 h-3" />
          <span>音高</span>
        </div>
        <ScrollingVisualizer
          data={spectrumData}
          height={120}
          color="#60A5FA"
          renderType="line"
          minValue={80}
          maxValue={400}
          maxFreq={8000}
          backgroundColor="#1a1a1a"
          smoothingFactor={0.15}
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

      {/* Pitch */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <div className="absolute top-1 left-1 flex items-center gap-1 z-10 text-xs text-white/60 bg-black/30 px-1.5 py-0.5 rounded">
          <Activity className="w-3 h-3" />
          <span>Pitch</span>
        </div>
        <ScrollingVisualizer
          data={pitchArray}
          height={120}
          renderType="line"
          minValue={80}
          maxValue={400}
          color={vadStatus ? "#60A5FA" : "#9CA3AF"}
          backgroundColor="#1a1a1a"
          smoothingFactor={0.15}
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
  );
}; 