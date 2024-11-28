import React from 'react';
import { ScrollingVisualizer } from '../ScrollingVisualizer';

export interface FeatureVisualizerProps {
  title: string;
  value?: string | number;
  data: number[] | Float32Array;
  height?: number;
  gradientColors?: {
    from: string;
    to: string;
  };
  visualizerProps: {
    renderType: 'heatmap' | 'line' | 'spectrumWithPitch';
    color?: string;
    minValue: number;
    maxValue: number;
    [key: string]: any;
  };
}

const FeatureVisualizer: React.FC<FeatureVisualizerProps> = ({
  title,
  value,
  data,
  height = 64,
  gradientColors = { from: 'gray-900', to: 'gray-800' },
  visualizerProps
}) => {
  return (
    <div
      className={`relative bg-gradient-to-r from-${gradientColors.from} to-${gradientColors.to} 
        rounded-xl overflow-hidden h-16 shadow-lg`}
    >
      <div className="absolute top-1.5 left-2 flex items-center gap-1 z-10">
        <span className="text-xs font-medium text-white/80">{title}</span>
        {value && (
          <span className="text-[10px] text-white/50 ml-1">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
        )}
      </div>
      <ScrollingVisualizer
        data={Array.from(data)}
        height={height}
        backgroundColor="transparent"
        {...visualizerProps}
      />
    </div>
  );
};

export default FeatureVisualizer;