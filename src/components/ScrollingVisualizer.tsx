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
  backgroundColor = '#ffffff'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[][]>([]);
  const lastDrawTimeRef = useRef<number>(Date.now());
  const MAX_HISTORY = 10 * 48;
  const FRAME_INTERVAL = 1000 / 48;

  // 动态范围追踪
  const rangeRef = useRef({
    min: minValue,
    max: maxValue,
    lastUpdate: Date.now()
  });

  useEffect(() => {
    if (!data?.length) return;

    const currentTime = Date.now();
    if (currentTime - lastDrawTimeRef.current < FRAME_INTERVAL) {
      return;
    }
    lastDrawTimeRef.current = currentTime;

    historyRef.current.push([...data]);
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
      // 对于音高图，动态调整显示范围
      if (historyRef.current.length > 0) {
        const validValues = historyRef.current
          .flatMap(frame => frame)
          .filter(value => value > 0); // 只考虑有效的音高值

        if (validValues.length > 0) {
          const currentMin = Math.min(...validValues);
          const currentMax = Math.max(...validValues);
          const timeSinceLastUpdate = currentTime - rangeRef.current.lastUpdate;

          // 平滑过渡到新的范围
          const transitionSpeed = 0.1; // 调整过渡速度
          rangeRef.current.min = Math.min(
            rangeRef.current.min,
            currentMin * 0.9
          );
          rangeRef.current.max = Math.max(
            rangeRef.current.max,
            currentMax * 1.1
          );

          // 如果一段时间没有新的极值，逐渐收缩范围
          if (timeSinceLastUpdate > 1000) { // 1秒
            const recentValues = historyRef.current
              .slice(-10)
              .flatMap(frame => frame)
              .filter(value => value > 0);

            if (recentValues.length > 0) {
              const recentMin = Math.min(...recentValues);
              const recentMax = Math.max(...recentValues);

              rangeRef.current.min = rangeRef.current.min * (1 - transitionSpeed) +
                recentMin * transitionSpeed;
              rangeRef.current.max = rangeRef.current.max * (1 - transitionSpeed) +
                recentMax * transitionSpeed;
            }
          }
        }
      }

      // 绘制音高线
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      historyRef.current.forEach((frameData, timeIndex) => {
        const x = (timeIndex * canvas.width) / MAX_HISTORY;
        const value = frameData[0];

        if (value === 0) return;

        // 使用动态范围进行归一化
        const normalizedValue = (value - rangeRef.current.min) /
          (rangeRef.current.max - rangeRef.current.min);

        // 添加边距
        const margin = height * 0.1;
        const y = Math.max(
          margin,
          Math.min(
            height - margin,
            height - (normalizedValue * (height - 2 * margin)) - margin
          )
        );

        if (timeIndex === 0 || historyRef.current[timeIndex - 1][0] === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
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
      // 绘制所有历史数据
      historyRef.current.forEach((frameData, timeIndex) => {
        const x = (timeIndex * canvas.width) / MAX_HISTORY;
        const sliceWidth = canvas.width / MAX_HISTORY;

        frameData.forEach((value, freqIndex) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          const binHeight = height / frameData.length;

          // MFCC热力图从上到下绘制
          const y = freqIndex * binHeight;
          const hue = Math.max(0, Math.min(240, (1 - normalizedValue) * 240));
          ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
          ctx.fillRect(x, y, sliceWidth - 0.5, binHeight - 0.5);
        });
      });
    }
  }, [data, height, color, backgroundColor, minValue, maxValue, renderType, maxFreq, useColormap, highlightPeak]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full h-full"
    />
  );
}; 