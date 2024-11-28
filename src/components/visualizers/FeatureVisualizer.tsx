import React from 'react';
import { ScrollingVisualizer } from '../ScrollingVisualizer';

interface LineConfig {
  name: string;
  color: string;
}

export interface FeatureVisualizerProps {
  title: string;
  value?: string | number;
  data: number[] | Float32Array | (number[] | Float32Array)[];
  height?: number;
  gradientColors?: {
    from: string;
    to: string;
  };
  visualizerProps: {
    renderType: 'heatmap' | 'line' | 'spectrumWithPitch' | 'multiLine';
    color?: string;
    lines?: LineConfig[];
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
  // 处理多线图数据
  const processedData = React.useMemo(() => {
    if (visualizerProps.renderType === 'multiLine' && Array.isArray(data)) {
      // 确保数据长度匹配线条数量
      const lineCount = visualizerProps.lines?.length || 1;
      if (data.length === lineCount) {
        return data.map(line => Array.isArray(line) ? line : Array.from(line));
      }
      // 如果数据长度不匹配，返回空数组
      return Array(lineCount).fill([]);
    }
    // 对于非多线图，转换为普通数组
    return Array.isArray(data) ? data : Array.from(data);
  }, [data, visualizerProps.renderType, visualizerProps.lines]);

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
        {visualizerProps.renderType === 'multiLine' && visualizerProps.lines && (
          <div className="flex items-center gap-2 ml-2">
            {visualizerProps.lines.map((line, index) => (
              <div key={line.name} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: line.color }}
                />
                <span className="text-[10px] text-white/50">{line.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <ScrollingVisualizer
        data={processedData}
        height={height}
        backgroundColor="transparent"
        {...visualizerProps}
      />
    </div>
  );
};

export default FeatureVisualizer;