import React, { useRef, useEffect } from 'react';

interface ScrollingVisualizerProps {
  data: number[];
  height: number;
  color: string;
  backgroundColor?: string;
  minValue?: number;
  maxValue?: number;
  renderType: 'line' | 'spectrum' | 'heatmap';
}

export const ScrollingVisualizer: React.FC<ScrollingVisualizerProps> = ({
  data,
  height,
  color,
  backgroundColor = '#1F2937',
  minValue = 0,
  maxValue = 1,
  renderType
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeDataRef = useRef<number[][]>([]);
  const MAX_HISTORY = 20 * 48; // 20秒 * 48帧/秒

  useEffect(() => {
    if (!data?.length) return;

    timeDataRef.current.push([...data]);
    if (timeDataRef.current.length > MAX_HISTORY) {
      timeDataRef.current.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sliceWidth = canvas.width / MAX_HISTORY;

    if (renderType === 'line') {
      // 线性图渲染
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      timeDataRef.current.forEach((frameData, i) => {
        const x = i * sliceWidth;
        const value = frameData[0];
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        const y = height - (normalizedValue * height);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    else if (renderType === 'spectrum') {
      // 频谱图渲染
      timeDataRef.current.forEach((frameData, i) => {
        const x = i * sliceWidth;
        frameData.forEach((value, j) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          const barHeight = (height / frameData.length);
          const y = j * barHeight;

          ctx.fillStyle = `hsla(${color}, 70%, ${normalizedValue * 100}%, 0.8)`;
          ctx.fillRect(x, y, sliceWidth, barHeight);
        });
      });
    }
    else if (renderType === 'heatmap') {
      // 热力图渲染
      timeDataRef.current.forEach((frameData, i) => {
        const x = i * sliceWidth;
        frameData.forEach((value, j) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          const barHeight = (height / frameData.length);
          const y = j * barHeight;

          const hue = Math.max(0, Math.min(240, (1 - normalizedValue) * 240));
          ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
          ctx.fillRect(x, y, sliceWidth, barHeight);
        });
      });
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={height}
      className="w-full rounded-lg"
    />
  );
}; 