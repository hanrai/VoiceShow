import React, { useRef, useEffect } from 'react';

interface ScrollingVisualizerProps {
  data: number[] | Float32Array;
  height: number;
  color?: string;
  renderType: 'spectrum' | 'line' | 'heatmap' | 'spectrumWithPitch';
  minValue: number;
  maxValue: number;
  maxFreq?: number;
  useColormap?: boolean;
  highlightPeak?: boolean;
  backgroundColor?: string;
  smoothingFactor?: number;
  displayUnit?: string;
  isEnergy?: boolean;
  clearBeforeDraw?: boolean;
  dominantFreq?: number | null;
  threshold?: number;
}

// 常量定义
const MAX_HISTORY = 10 * 48;
const FRAME_INTERVAL = 1000 / 48;

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
  const r = Math.floor(255 * Math.min(Math.max(4 * normalized - 1.5, 0), 1));
  const g = Math.floor(255 * Math.sin(Math.PI * normalized));
  const b = Math.floor(255 * Math.min(Math.max(1.5 - 4 * normalized, 0), 1));
  return `rgb(${r},${g},${b})`;
};

// Viridis 颜色映射函数
const getViridisColor = (value: number): string => {
  const r = Math.floor(255 * Math.min(Math.max(4 * value - 1.5, 0), 1));
  const g = Math.floor(255 * Math.sin(Math.PI * value));
  const b = Math.floor(255 * Math.min(Math.max(1.5 - 4 * value, 0), 1));
  return `rgb(${r},${g},${b})`;
};

// 渲染线条
const renderLine = (
  ctx: CanvasRenderingContext2D,
  data: number[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
  color: string,
  smoothingFactor: number
) => {
  const historyLength = Math.min(data.length, MAX_HISTORY);
  const stepSize = width / (historyLength - 1);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((value, index) => {
    const x = index * stepSize;
    const normalizedValue = (value - minValue) / (maxValue - minValue);
    const y = height - (normalizedValue * height);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
};

// 渲染热图
const renderHeatmap = (
  ctx: CanvasRenderingContext2D,
  data: number[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number
) => {
  const binHeight = height / data.length;

  data.forEach((value, index) => {
    const normalizedValue = (value - minValue) / (maxValue - minValue);
    const y = index * binHeight;

    ctx.fillStyle = getViridisColor(normalizedValue);
    ctx.fillRect(width - 1, y, 1, binHeight);
  });

  // 左移现有图像
  const imageData = ctx.getImageData(1, 0, width - 1, height);
  ctx.putImageData(imageData, 0, 0);
};

// 渲染频谱
const renderSpectrum = (
  ctx: CanvasRenderingContext2D,
  data: number[] | Float32Array,
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
  useColormap: boolean,
  highlightPeak: boolean
) => {
  const barWidth = width / data.length;
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
      ctx.fillStyle = getViridisColor(normalizedValue);
    }

    ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

    if (highlightPeak && index === maxEnergyIndex) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(x - 1, 0, barWidth + 2, height);
    }
  });
};

// 渲染带音高的频谱
const renderSpectrumWithPitch = (
  ctx: CanvasRenderingContext2D,
  data: number[] | Float32Array,
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
  dominantFreq: number | null | undefined,
  maxFreq: number,
  threshold: number
) => {
  renderSpectrum(ctx, data, width, height, minValue, maxValue, true, false);

  if (dominantFreq !== null && dominantFreq !== undefined) {
    const x = (dominantFreq / maxFreq) * width;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(`${Math.round(dominantFreq)}Hz`, x + 5, 15);
  }
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
  isEnergy = false,
  clearBeforeDraw = false,
  dominantFreq,
  threshold = -60
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[][]>([]);
  const lastDrawTimeRef = useRef<number>(Date.now());
  const emaRef = useRef<number>(0);
  const displayRangeRef = useRef<{ min: number; max: number }>({ min: minValue, max: maxValue });
  const imageDataRef = useRef<ImageData | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // 初始化 canvas context
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
      alpha: true
    });

    if (!ctx) return;
    contextRef.current = ctx;

    // 设置画布尺寸
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    }

    // 初始背景
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [backgroundColor]);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx || !canvasRef.current) return;

    // 确保数据有效
    if (!data || (Array.isArray(data) && data.length === 0)) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      return;
    }

    const currentTime = Date.now();
    if (currentTime - lastDrawTimeRef.current < FRAME_INTERVAL) {
      return;
    }
    lastDrawTimeRef.current = currentTime;

    // 如果需要清除画布
    if (clearBeforeDraw) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // 根据渲染类型选择不同的渲染方法
    switch (renderType) {
      case 'spectrum':
        renderSpectrum(ctx, data, ctx.canvas.width, ctx.canvas.height, minValue, maxValue, useColormap, highlightPeak);
        break;
      case 'line':
        const dataArray = Array.isArray(data) ? data : Array.from(data);
        renderLine(ctx, dataArray, ctx.canvas.width, ctx.canvas.height, minValue, maxValue, color, smoothingFactor);
        break;
      case 'heatmap':
        const heatmapData = Array.isArray(data) ? data : Array.from(data);
        renderHeatmap(ctx, heatmapData, ctx.canvas.width, ctx.canvas.height, minValue, maxValue);
        break;
      case 'spectrumWithPitch':
        renderSpectrumWithPitch(ctx, data, ctx.canvas.width, ctx.canvas.height, minValue, maxValue, dominantFreq, maxFreq, threshold);
        break;
    }
  }, [data, height, color, renderType, minValue, maxValue, useColormap, highlightPeak, backgroundColor, smoothingFactor, clearBeforeDraw, dominantFreq, threshold, maxFreq]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}; 