import React from 'react';
import { ScrollingVisualizer } from './ScrollingVisualizer';

interface AudioFeaturesProps {
  spectrumData: number[];
  mfccData: number[];
  pitchData: number[];
  loudnessData: number[];
}

export const AudioFeatures: React.FC<AudioFeaturesProps> = ({
  spectrumData,
  mfccData,
  pitchData,
  loudnessData
}) => {
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
    <div className="space-y-2 mt-6">
      {/* 频谱图 */}
      <div className="h-[48px]">
        <ScrollingVisualizer
          data={spectrumData}
          height={48}
          renderType="spectrum"
          minValue={-100}
          maxValue={0}
          maxFreq={8000}
          useColormap={true}
          highlightPeak={true}
          backgroundColor="#1a1a1a"
        />
      </div>

      {/* MFCC图 */}
      <div className="h-[48px]">
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

      {/* 音高图 - 主频率的EMA */}
      <div className="h-12">
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

      {/* 总能量移动均线 - 修改显示范围 */}
      <div className="h-12">
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
  );
}; 