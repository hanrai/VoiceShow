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
      {/* 频谱图 - 使用彩色渲染 */}
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
        />
      </div>

      {/* 音高图 - 调整频率范围 */}
      <div className="h-12">
        <ScrollingVisualizer
          data={pitchData}
          height={48}
          color="#60A5FA"
          renderType="line"
          minValue={80}   // 最低频率 80Hz
          maxValue={400}  // 最高频率 400Hz
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
        />
      </div>
    </div>
  );
}; 