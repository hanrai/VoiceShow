import React, { useRef, useEffect } from 'react';

interface ScrollingVisualizerProps {
  data: number[];
  height: number;
  color?: string;
  renderType: 'spectrum' | 'line' | 'heatmap';
  minValue: number;
  maxValue: number;
  maxFreq?: number;
  useColormap?: boolean;
  highlightPeak?: boolean;
  backgroundColor?: string;
  smoothingFactor?: number;
  displayUnit?: string;
  isEnergy?: boolean;
}

// 线性频率转梅尔频率
const freqToMel = (freq: number): number => {
  return 2595 * Math.log10(1 + freq / 700);
};

// 梅尔频率转线性频率
const melToFreq = (mel: number): number => {
  return 700 * (Math.pow(10, mel / 2595) - 1);
};

// 创建梅尔频率刻度
const createMelScale = (minFreq: number, maxFreq: number, numBins: number): number[] => {
  const minMel = freqToMel(minFreq);
  const maxMel = freqToMel(maxFreq);
  const melStep = (maxMel - minMel) / (numBins - 1);

  return Array.from({ length: numBins }, (_, i) => {
    const mel = minMel + i * melStep;
    return melToFreq(mel);
  });
};

// 添加颜色映射函数
const getColor = (value: number, min: number, max: number): string => {
  const normalized = (value - min) / (max - min);
  // 使用viridis类似的配色方案
  const r = Math.floor(255 * Math.min(Math.max(4 * normalized - 1.5, 0), 1));
  const g = Math.floor(255 * Math.sin(Math.PI * normalized));
  const b = Math.floor(255 * Math.min(Math.max(1.5 - 4 * normalized, 0), 1));
  return `rgb(${r},${g},${b})`;
};

// 在渲染频谱的函数中
const renderSpectrum = (
  ctx: CanvasRenderingContext2D, 
  data: number[], 
  width: number, 
  height: number,
  minValue: number,
  maxValue: number,
  useColormap: boolean,
  highlightPeak: boolean
) => {
  const barWidth = width / data.length;
  
  // 找到最大能量及其频率索引
  let maxEnergy = -Infinity;
  let maxEnergyIndex = 0;
  
  data.forEach((value, index) => {
    if (value > maxEnergy) {
      maxEnergy = value;
      maxEnergyIndex = index;
    }
  });

  data.forEach((value, index) => {
    const x = index * barWidth;
    const normalizedValue = (value - minValue) / (maxValue - minValue);
    const barHeight = normalizedValue * height;

    if (useColormap) {
      ctx.fillStyle = getColor(value, minValue, maxValue);
    }
    
    ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

    // 绘制峰值高亮
    if (highlightPeak && index === maxEnergyIndex) {
      ctx.fillStyle = '#ff0000';  // 红色高亮
      ctx.fillRect(x - 1, 0, barWidth + 2, height);
      ctx.fillStyle = '#ffffff';  // 白色中心线
      ctx.fillRect(x, 0, barWidth, height);
    }
  });
};

// 添加 Viridis 颜色映射函数
const getViridisColor = (value: number): string => {
  // 简化版的 Viridis 颜色映射
  const r = Math.floor(255 * Math.min(Math.max(4 * value - 1.5, 0), 1));
  const g = Math.floor(255 * Math.sin(Math.PI * value));
  const b = Math.floor(255 * Math.min(Math.max(1.5 - 4 * value, 0), 1));
  return `rgb(${r},${g},${b})`;
};

// 添加指数移动平均计算函数
const calculateEMA = (currentValue: number, previousEMA: number, smoothingFactor: number): number => {
  return currentValue * smoothingFactor + previousEMA * (1 - smoothingFactor);
};

export const ScrollingVisualizer: React.FC<ScrollingVisualizerProps> = ({
  data,
  height,
  color = '#000000',
  renderType,
  minValue,
  maxValue,
  maxFreq = 20000,
  useColormap = false,
  highlightPeak = false,
  backgroundColor = '#1a1a1a',
  smoothingFactor = 0.15,
  displayUnit = 'Hz',
  isEnergy = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[][]>([]);
  const lastDrawTimeRef = useRef<number>(Date.now());
  const emaRef = useRef<number>(0);
  const rangeRef = useRef({ min: minValue, max: maxValue });
  const MAX_HISTORY = 10 * 48;
  const FRAME_INTERVAL = 1000 / 48;

  useEffect(() => {
    if (!data?.length) return;

    const currentTime = Date.now();
    if (currentTime - lastDrawTimeRef.current < FRAME_INTERVAL) {
      return;
    }
    lastDrawTimeRef.current = currentTime;

    if (renderType === 'line') {
      if (!isEnergy) {
        let maxEnergy = -Infinity;
        let maxFreqIndex = 0;
        data.forEach((value, index) => {
          if (value > maxEnergy) {
            maxEnergy = value;
            maxFreqIndex = index;
          }
        });

        const frequencyResolution = maxFreq / data.length;
        const dominantFreq = maxFreqIndex * frequencyResolution;
        emaRef.current = calculateEMA(dominantFreq, emaRef.current, smoothingFactor);
      } else {
        emaRef.current = calculateEMA(data[0], emaRef.current, smoothingFactor);
      }

      const RANGE_SMOOTHING = 0.05;
      const PADDING_FACTOR = 0.2;

      const recentValues = historyRef.current
        .slice(-20)
        .map(frame => frame[0])
        .filter(v => v !== undefined);

      if (recentValues.length > 0) {
        const currentMin = Math.min(...recentValues);
        const currentMax = Math.max(...recentValues);
        const range = currentMax - currentMin;
        const padding = range * PADDING_FACTOR;

        rangeRef.current.min = calculateEMA(
          currentMin - padding,
          rangeRef.current.min,
          RANGE_SMOOTHING
        );
        rangeRef.current.max = calculateEMA(
          currentMax + padding,
          rangeRef.current.max,
          RANGE_SMOOTHING
        );
      }

      historyRef.current.push([emaRef.current]);
    } else {
      historyRef.current.push([...data]);
    }

    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (renderType === 'line') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      historyRef.current.forEach((frameData, timeIndex) => {
        const x = (timeIndex * canvas.width) / MAX_HISTORY;
        const value = frameData[0];

        const normalizedValue = (value - rangeRef.current.min) / 
          (rangeRef.current.max - rangeRef.current.min);
        
        const margin = height * 0.1;
        const y = Math.max(
          margin,
          Math.min(
            height - margin,
            height - (normalizedValue * (height - 2 * margin)) - margin
          )
        );

        if (timeIndex === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      const currentValue = historyRef.current[historyRef.current.length - 1]?.[0];
      if (currentValue !== undefined) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(
          `${isEnergy ? currentValue.toFixed(1) : Math.round(currentValue)}${displayUnit}`, 
          canvas.width - 50, 
          20
        );
      }
    }
    else if (renderType === 'spectrum') {
      renderSpectrum(
        ctx, 
        data, 
        canvas.width, 
        height, 
        minValue, 
        maxValue, 
        useColormap, 
        highlightPeak
      );
    }
    else if (renderType === 'heatmap') {
      historyRef.current.forEach((frameData, timeIndex) => {
        const x = (timeIndex * canvas.width) / MAX_HISTORY;
        const sliceWidth = canvas.width / MAX_HISTORY;

        frameData.forEach((value, freqIndex) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          const binHeight = height / frameData.length;

          const y = freqIndex * binHeight;
          const hue = Math.max(0, Math.min(240, (1 - normalizedValue) * 240));
          ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
          ctx.fillRect(x, y, sliceWidth - 0.5, binHeight - 0.5);
        });
      });
    }
  }, [data, height, color, backgroundColor, minValue, maxValue, renderType, maxFreq, useColormap, highlightPeak, smoothingFactor, displayUnit, isEnergy]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full h-full"
      style={{ backgroundColor }}
    />
  );
}; 