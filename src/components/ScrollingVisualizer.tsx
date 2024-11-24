import React, { useRef, useEffect } from 'react';

interface ScrollingVisualizerProps {
  data: number[];
  height: number;
  color: string;
  backgroundColor?: string;
  minValue?: number;
  maxValue?: number;
  renderType: 'line' | 'spectrum' | 'heatmap';
  maxFreq?: number;
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

// 添加 viridis 类似的颜色映射函数
const getViridisColor = (value: number): string => {
  // 将值映射到[0,1]区间
  const t = Math.max(0, Math.min(1, value));

  // viridis 颜色映射的简化版本
  const c0 = [68, 1, 84];    // 深紫色
  const c1 = [65, 182, 196]; // 青色
  const c2 = [233, 229, 27]; // 黄色

  let r, g, b;
  if (t < 0.5) {
    // 在深紫色和青色之间插值
    const s = t * 2;
    r = c0[0] + (c1[0] - c0[0]) * s;
    g = c0[1] + (c1[1] - c0[1]) * s;
    b = c0[2] + (c1[2] - c0[2]) * s;
  } else {
    // 在青色和黄色之间插值
    const s = (t - 0.5) * 2;
    r = c1[0] + (c2[0] - c1[0]) * s;
    g = c1[1] + (c2[1] - c1[1]) * s;
    b = c1[2] + (c2[2] - c1[2]) * s;
  }

  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.9)`;
};

export const ScrollingVisualizer: React.FC<ScrollingVisualizerProps> = ({
  data,
  height,
  color,
  backgroundColor = '#1F2937',
  minValue = 0,
  maxValue = 1,
  renderType,
  maxFreq = 20000
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[][]>([]);
  const MAX_HISTORY = 10 * 48;

  // 添加动态范围追踪
  const rangeRef = useRef({ min: minValue, max: maxValue });

  useEffect(() => {
    if (!data?.length) return;

    // 如果是频谱图，根据最大频率限制数据
    const processedData = renderType === 'spectrum'
      ? data.slice(0, Math.floor((data.length * maxFreq) / 22050))
      : data;

    historyRef.current.push([...processedData]);
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

      let isDrawing = false;
      const sliceWidth = canvas.width / MAX_HISTORY;

      // 对于音高图，动态计算显示范围
      if (historyRef.current.length > 0) {
        const validValues = historyRef.current
          .flatMap(frame => frame)
          .filter(value => value > 0); // 只考虑有效的音高值

        if (validValues.length > 0) {
          const currentMin = Math.min(...validValues);
          const currentMax = Math.max(...validValues);

          // 平滑过渡到新的范围
          rangeRef.current.min = Math.min(rangeRef.current.min, currentMin * 0.9);
          rangeRef.current.max = Math.max(rangeRef.current.max, currentMax * 1.1);

          // 如果没有最近的数据点超过范围，逐渐收缩范围
          const recentValues = historyRef.current.slice(-10).flatMap(frame => frame).filter(value => value > 0);
          if (recentValues.length > 0) {
            const recentMin = Math.min(...recentValues);
            const recentMax = Math.max(...recentValues);
            rangeRef.current.min = rangeRef.current.min * 0.95 + recentMin * 0.05;
            rangeRef.current.max = rangeRef.current.max * 0.95 + recentMax * 0.05;
          }
        }
      }

      historyRef.current.forEach((frameData, i) => {
        const x = i * sliceWidth;
        const value = frameData[0];

        if (value === 0) {
          isDrawing = false;
          return;
        }

        // 使用动态范围进行归一化
        const normalizedValue = (value - rangeRef.current.min) /
          (rangeRef.current.max - rangeRef.current.min);

        // 确保y值在画布范围内，并留出边距
        const margin = height * 0.1; // 10% 边距
        const y = Math.max(margin, Math.min(height - margin,
          height - (normalizedValue * (height - 2 * margin)) - margin));

        if (!isDrawing) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          isDrawing = true;
        } else {
          ctx.lineTo(x, y);
        }

        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      });
    }
    else if (renderType === 'spectrum' || renderType === 'heatmap') {
      const sliceWidth = canvas.width / MAX_HISTORY;

      // 创建梅尔频率刻度（仅用于频谱图）
      const melScale = renderType === 'spectrum'
        ? createMelScale(20, maxFreq, processedData.length)
        : null;

      historyRef.current.forEach((frameData, timeIndex) => {
        frameData.forEach((value, freqIndex) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          const x = timeIndex * sliceWidth;

          // 计算y坐标
          let y;
          if (renderType === 'spectrum' && melScale) {
            // 使用梅尔比例尺
            const melPos = melScale[freqIndex] / maxFreq; // 归一化到[0,1]
            y = height - (melPos * height);
          } else {
            // MFCC保持线性比例
            const binHeight = height / processedData.length;
            y = freqIndex * binHeight;
          }

          // 计算高度
          const binHeight = renderType === 'spectrum' && melScale
            ? (height / processedData.length) * (melScale[freqIndex + 1] - melScale[freqIndex]) / maxFreq
            : height / processedData.length;

          if (renderType === 'spectrum') {
            ctx.fillStyle = getViridisColor(normalizedValue);
          } else {
            const hue = Math.max(0, Math.min(240, (1 - normalizedValue) * 240));
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
          }

          ctx.fillRect(x, y, sliceWidth - 0.5, Math.max(1, binHeight));
        });
      });
    }
  }, [data, height, color, backgroundColor, minValue, maxValue, renderType, maxFreq]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full h-full"
    />
  );
}; 