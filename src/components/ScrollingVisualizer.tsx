import React, { useRef, useEffect } from 'react';

interface ScrollingVisualizerProps {
  data: number[] | number[][];
  height?: number;
  backgroundColor?: string;
  renderType: 'heatmap' | 'line' | 'spectrumWithPitch' | 'multiLine';
  color?: string;
  lines?: Array<{ name: string; color: string }>;
  minValue: number;
  maxValue: number;
  smoothingFactor?: number;
  maxFreq?: number;
  threshold?: number;
  clearBeforeDraw?: boolean;
}

export const ScrollingVisualizer: React.FC<ScrollingVisualizerProps> = ({
  data,
  height = 64,
  backgroundColor = '#000',
  renderType,
  color = 'rgba(52, 211, 153, 0.8)',
  lines = [],
  minValue,
  maxValue,
  smoothingFactor = 0.1,
  maxFreq,
  threshold = -60,
  clearBeforeDraw = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    contextRef.current = ctx;

    // 设置画布尺寸
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    // 清空画布
    if (clearBeforeDraw) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 根据渲染类型选择绘制方法
    switch (renderType) {
      case 'multiLine':
        drawMultiLine(ctx, data as number[][], canvas.width, canvas.height);
        break;
      case 'line':
        drawLine(ctx, data as number[], canvas.width, canvas.height);
        break;
      case 'spectrumWithPitch':
        drawSpectrum(ctx, data as number[], canvas.width, canvas.height);
        break;
      case 'heatmap':
        drawHeatmap(ctx, data as number[], canvas.width, canvas.height);
        break;
    }
  }, [data, height, backgroundColor, renderType, color, minValue, maxValue, smoothingFactor]);

  // 绘制多线图
  const drawMultiLine = (
    ctx: CanvasRenderingContext2D,
    data: number[][],
    width: number,
    height: number
  ) => {
    if (!Array.isArray(data) || data.length === 0) return;

    const lineColors = lines.map(l => l.color);
    data.forEach((lineData, lineIndex) => {
      ctx.beginPath();
      ctx.strokeStyle = lineColors[lineIndex] || color;
      ctx.lineWidth = 2;

      const step = width / (lineData.length - 1);
      lineData.forEach((value, index) => {
        const x = index * step;
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        const y = height - normalizedValue * height;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });
  };

  // 绘制单线图
  const drawLine = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number
  ) => {
    if (!Array.isArray(data) || data.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    const step = width / (data.length - 1);
    data.forEach((value, index) => {
      const x = index * step;
      const normalizedValue = (value - minValue) / (maxValue - minValue);
      const y = height - normalizedValue * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  // 绘制频谱图
  const drawSpectrum = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number
  ) => {
    if (!Array.isArray(data) || data.length === 0) return;

    const barWidth = width / data.length;
    data.forEach((value, index) => {
      const normalizedValue = (value - minValue) / (maxValue - minValue);
      const barHeight = normalizedValue * height;

      ctx.fillStyle = color;
      ctx.fillRect(
        index * barWidth,
        height - barHeight,
        barWidth * 0.8,
        barHeight
      );
    });
  };

  // 绘制热力图
  const drawHeatmap = (
    ctx: CanvasRenderingContext2D,
    data: number[],
    width: number,
    height: number
  ) => {
    if (!Array.isArray(data) || data.length === 0) return;

    const cellWidth = width / data.length;
    const cellHeight = height;

    data.forEach((value, index) => {
      const normalizedValue = (value - minValue) / (maxValue - minValue);
      const hue = 240 - normalizedValue * 240; // 从蓝色到红色
      ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${normalizedValue})`;
      ctx.fillRect(index * cellWidth, 0, cellWidth, cellHeight);
    });
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'block',
      }}
    />
  );
}; 