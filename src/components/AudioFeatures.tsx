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
      <div className="feature-card">
        <div className="feature-header">
          <Activity className="w-4 h-4" />
          <span>波形</span>
        </div>
        <div className="feature-content">
          <AudioVisualizer data={waveformData} type="waveform" />
        </div>
      </div>

      {/* MFCC图 */}
      <div className="feature-card">
        <div className="feature-header">
          <Activity className="w-4 h-4" />
          <span>MFCC</span>
        </div>
        <div className="feature-content">
          <ScrollingVisualizer
            data={mfccData}
            height={48}
            color="0"
            renderType="heatmap"
            minValue={-80}
            maxValue={80}
            backgroundColor="#1a1a1a"
          />
        </div>
      </div>

      {/* 音高图 - 主频率的EMA */}
      <div className="feature-card">
        <div className="feature-header">
          <Activity className="w-4 h-4" />
          <span>音高</span>
        </div>
        <div className="feature-content">
          <ScrollingVisualizer
            data={spectrumData}
            height={48}
            color="#60A5FA"
            renderType="line"
            minValue={80}
            maxValue={400}
            maxFreq={8000}
            backgroundColor="#1a1a1a"
            smoothingFactor={0.15}
          />
        </div>
      </div>

      {/* 总能量移动均线 - 修改显示范围 */}
      <div className="feature-card">
        <div className="feature-header">
          <Activity className="w-4 h-4" />
          <span>总能量</span>
        </div>
        <div className="feature-content">
          <ScrollingVisualizer
            data={[calculateTotalEnergy(spectrumData)]}
            height={48}
            color="#34D399"
            renderType="line"
            minValue={-80}   // 调整最小值
            maxValue={-20}   // 调整最大值
            backgroundColor="#1a1a1a"
            smoothingFactor={0.1}
            displayUnit="dB"
            isEnergy={true}
          />
        </div>
      </div>

      {/* Pitch 和 VAD 状态 */}
      <div className="feature-card">
        <div className="feature-header">
          <Activity className="w-4 h-4" />
          <span>Pitch</span>
        </div>
        <div className="feature-content">
          <ScrollingVisualizer
            data={pitchArray}
            height={64}
            renderType="line"
            minValue={80}
            maxValue={400}
            color={vadStatus ? "#60A5FA" : "#9CA3AF"}
            backgroundColor="#1a1a1a"
            smoothingFactor={0.15}
          />
        </div>
      </div>

      {/* Loudness */}
      <div className="feature-card">
        <div className="feature-header">
          <Activity className="w-4 h-4" />
          <span>Loudness</span>
        </div>
        <div className="feature-content">
          <ScrollingVisualizer
            data={loudnessArray}
            height={64}
            renderType="line"
            minValue={-60}  // 最小分贝值
            maxValue={0}    // 最大分贝值
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