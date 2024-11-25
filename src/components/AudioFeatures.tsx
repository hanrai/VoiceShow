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

      {/* 音高图 - 现在显示主频率的EMA */}
      <div className="h-12">
        <ScrollingVisualizer
          data={spectrumData}  // 使用频谱数据而不是音高数据
          height={48}
          color="#60A5FA"
          renderType="line"
          minValue={80}
          maxValue={400}
          maxFreq={8000}
          backgroundColor="#1a1a1a"
          smoothingFactor={0.15}  // 添加平滑因子
        />
      </div>

      {/* 响度图 */}
      <div className="h-12">
        <ScrollingVisualizer
          data={loudnessData}
          height={48}
          color="#34D399"
          renderType="line"
          minValue={-60}
          maxValue={0}
          backgroundColor="#1a1a1a"
        />
      </div>
    </div>
  );
}; 