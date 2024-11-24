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
    else if (renderType === 'spectrum' || renderType === 'heatmap') {
      // 绘制所有历史数据
      historyRef.current.forEach((frameData, timeIndex) => {
        const x = (timeIndex * canvas.width) / MAX_HISTORY;
        const sliceWidth = canvas.width / MAX_HISTORY;

        frameData.forEach((value, freqIndex) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          const binHeight = height / frameData.length;

          if (renderType === 'spectrum') {
            // 频谱图从下到上绘制
            const y = height - ((freqIndex + 1) * binHeight);
            ctx.fillStyle = getViridisColor(normalizedValue);
            ctx.fillRect(x, y, sliceWidth - 0.5, binHeight - 0.5);
          } else {
            // MFCC热力图从上到下绘制
            const y = freqIndex * binHeight;
            const hue = Math.max(0, Math.min(240, (1 - normalizedValue) * 240));
            ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
            ctx.fillRect(x, y, sliceWidth - 0.5, binHeight - 0.5);
          }
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