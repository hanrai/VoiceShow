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
  data: number[] | Float32Array,
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

    // 绘制峰值亮
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

// 添加高斯模糊辅助函数
const applyGaussianBlur = (data: Uint8ClampedArray, width: number, height: number, radius: number) => {
  const kernel = createGaussianKernel(radius);
  const tempData = new Uint8ClampedArray(data.length);

  // 水平方向模糊
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let weightSum = 0;

      for (let i = -radius; i <= radius; i++) {
        const px = Math.min(Math.max(x + i, 0), width - 1);
        const weight = kernel[i + radius];
        const idx = (y * width + px) * 4;

        r += data[idx] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        a += data[idx + 3] * weight;
        weightSum += weight;
      }

      const destIdx = (y * width + x) * 4;
      tempData[destIdx] = r / weightSum;
      tempData[destIdx + 1] = g / weightSum;
      tempData[destIdx + 2] = b / weightSum;
      tempData[destIdx + 3] = a / weightSum;
    }
  }

  // 垂直方向模糊
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      let weightSum = 0;

      for (let i = -radius; i <= radius; i++) {
        const py = Math.min(Math.max(y + i, 0), height - 1);
        const weight = kernel[i + radius];
        const idx = (py * width + x) * 4;

        r += tempData[idx] * weight;
        g += tempData[idx + 1] * weight;
        b += tempData[idx + 2] * weight;
        a += tempData[idx + 3] * weight;
        weightSum += weight;
      }

      const destIdx = (y * width + x) * 4;
      data[destIdx] = r / weightSum;
      data[destIdx + 1] = g / weightSum;
      data[destIdx + 2] = b / weightSum;
      data[destIdx + 3] = a / weightSum;
    }
  }
};

const createGaussianKernel = (radius: number): number[] => {
  const kernel = [];
  const sigma = radius / 3;
  for (let i = -radius; i <= radius; i++) {
    kernel.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  }
  return kernel;
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
  const MAX_HISTORY = 10 * 48;
  const FRAME_INTERVAL = 1000 / 48;
  const imageDataRef = useRef<ImageData | null>(null);

  const renderSpectrumWithPitch = (
    ctx: CanvasRenderingContext2D,
    currentData: number[] | Float32Array,
    width: number,
    height: number,
    min: number,
    max: number,
    freq: number | null | undefined,
    freqMax: number,
    thresh: number
  ) => {
    if (!currentData?.length) return;

    // 1. 初始化或获取 ImageData
    if (!imageDataRef.current) {
      imageDataRef.current = ctx.createImageData(width, height);
    }
    const imageData = imageDataRef.current;
    const data = imageData.data;

    // 2. 左移一列像素
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width - 1; x++) {
        const srcIndex = (y * width + x + 1) * 4;
        const destIndex = (y * width + x) * 4;
        data[destIndex] = data[srcIndex];
        data[destIndex + 1] = data[srcIndex + 1];
        data[destIndex + 2] = data[srcIndex + 2];
        data[destIndex + 3] = data[srcIndex + 3];
      }
    }

    // 3. 绘制新的一列数据
    const x = width - 1;
    const binReduction = 2;
    const reducedData: number[] = [];
    for (let i = 0; i < currentData.length; i += binReduction) {
      const binData = Array.from(currentData.slice(i, i + binReduction));
      const sum = binData.reduce((acc: number, curr: number) => acc + curr, 0);
      reducedData.push(sum / binReduction);
    }

    // 4. 更新最右侧列的像素
    reducedData.forEach((value, freqIndex) => {
      const normalizedValue = (value - min) / (max - min);
      const binHeight = height / reducedData.length;
      // 反转Y轴坐标
      const startY = height - Math.floor((freqIndex + 1) * binHeight);
      const endY = height - Math.floor(freqIndex * binHeight);

      // 计算颜色，降低不透明度
      const hue = Math.max(0, Math.min(240, (1 - normalizedValue) * 240));
      const [r, g, b] = hslToRgb(hue / 360, 1, 0.5);

      // 填充该频率bin对应的像素，降低透明度
      for (let y = startY; y < endY; y++) {
        const index = (y * width + x) * 4;
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 128; // 降低透明度到 0.5
      }
    });

    // 5. 如果有主频率，在最右侧绘制标记
    if (freq !== undefined && freq !== null) {
      // 反转Y轴坐标
      const freqY = height - Math.floor((freq / freqMax) * height);

      // 绘制发光效果
      const glowRadius = 3;
      for (let dy = -glowRadius; dy <= glowRadius; dy++) {
        for (let dx = -glowRadius; dx <= glowRadius; dx++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= glowRadius) {
            const py = freqY + dy;
            const px = x + dx;
            if (py >= 0 && py < height && px >= 0 && px < width) {
              const index = (py * width + px) * 4;
              const alpha = Math.floor(255 * (1 - distance / glowRadius) * 0.8);
              data[index] = 255;
              data[index + 1] = 255;
              data[index + 2] = 255;
              data[index + 3] = alpha;
            }
          }
        }
      }

      // 绘制中心线
      for (let dy = -1; dy <= 1; dy++) {
        const py = freqY + dy;
        if (py >= 0 && py < height) {
          for (let dx = -2; dx <= 2; dx++) {
            const px = x + dx;
            if (px >= 0 && px < width) {
              const index = (py * width + px) * 4;
              data[index] = 255;
              data[index + 1] = 255;
              data[index + 2] = 255;
              data[index + 3] = 255; // 完全不透明的中心线
            }
          }
        }
      }
    }

    // 6. 将 ImageData 绘制到画布上
    ctx.putImageData(imageData, 0, 0);

    // 7. 绘制频率刻度
    if (!ctx.canvas.getAttribute('scales-drawn')) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      const freqSteps = [0, 500, 1000, 1500, 2000];
      freqSteps.forEach(f => {
        // 反转Y轴坐标
        const y = height - (f / freqMax) * height;
        ctx.fillText(`${f}Hz`, width - 5, y + 4);
      });
      ctx.canvas.setAttribute('scales-drawn', 'true');
    }
  };

  // HSL 转 RGB 的辅助函数
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255)
    ];
  };

  useEffect(() => {
    if (!data?.length) return;

    const currentTime = Date.now();
    if (currentTime - lastDrawTimeRef.current < FRAME_INTERVAL) {
      return;
    }
    lastDrawTimeRef.current = currentTime;

    // 更新历史数据
    if (renderType === 'spectrumWithPitch' || renderType === 'heatmap') {
      historyRef.current.push(Array.from(data));
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (renderType === 'line') {
      // 计算当前值
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

      historyRef.current.push([emaRef.current]);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }

      // 动态更新显示范围
      const allValues = historyRef.current.map(frame => frame[0]);
      const currentMin = Math.min(...allValues);
      const currentMax = Math.max(...allValues);
      const range = currentMax - currentMin;
      const padding = range * 0.2;

      // 只有当新值超出当前范围时才扩展范围
      displayRangeRef.current = {
        min: Math.min(displayRangeRef.current.min, currentMin - padding),
        max: Math.max(displayRangeRef.current.max, currentMax + padding)
      };

      // 缓慢收缩范围以适应新的数据
      const RANGE_SHRINK_FACTOR = 0.001; // 非常缓慢的收缩
      const recentValues = historyRef.current.slice(-20).map(frame => frame[0]);
      const recentMin = Math.min(...recentValues);
      const recentMax = Math.max(...recentValues);
      const recentPadding = (recentMax - recentMin) * 0.2;

      displayRangeRef.current = {
        min: displayRangeRef.current.min +
          (Math.max(recentMin - recentPadding, minValue) - displayRangeRef.current.min) *
          RANGE_SHRINK_FACTOR,
        max: displayRangeRef.current.max +
          (Math.min(recentMax + recentPadding, maxValue) - displayRangeRef.current.max) *
          RANGE_SHRINK_FACTOR
      };
    }

    if (renderType === 'line') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      historyRef.current.forEach((frameData, timeIndex) => {
        const x = (timeIndex * canvas.width) / MAX_HISTORY;
        const value = frameData[0];

        const normalizedValue = (value - displayRangeRef.current.min) /
          (displayRangeRef.current.max - displayRangeRef.current.min);

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

      // 显示当前值和范围
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
      // 1. 初始化或获取 ImageData
      if (!imageDataRef.current) {
        imageDataRef.current = ctx.createImageData(canvas.width, height);
      }
      const imageData = imageDataRef.current;
      const imageData8 = imageData.data;

      // 2. 左移一列像素
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < canvas.width - 1; x++) {
          const srcIndex = (y * canvas.width + x + 1) * 4;
          const destIndex = (y * canvas.width + x) * 4;
          imageData8[destIndex] = imageData8[srcIndex];
          imageData8[destIndex + 1] = imageData8[srcIndex + 1];
          imageData8[destIndex + 2] = imageData8[srcIndex + 2];
          imageData8[destIndex + 3] = imageData8[srcIndex + 3];
        }
      }

      // 3. 绘制新的一列数据
      const x = canvas.width - 1;
      const numCoefficients = Array.isArray(data) ? data.length : data.length;
      const binHeight = height / numCoefficients;

      // 4. 更新最右侧列的像素
      for (let i = 0; i < numCoefficients; i++) {
        const value = Array.isArray(data) ? data[i] : data[i];
        const normalizedValue = (value - minValue) / (maxValue - minValue);

        // 反转Y轴坐标
        const startY = height - Math.floor((i + 1) * binHeight);
        const endY = height - Math.floor(i * binHeight);

        // 使用viridis颜色映射
        const color = getViridisColor(normalizedValue);
        const [r, g, b] = color.match(/\d+/g)!.map(Number);

        // 填充该系数对应的像素
        for (let y = startY; y < endY; y++) {
          const index = (y * canvas.width + x) * 4;
          imageData8[index] = r;
          imageData8[index + 1] = g;
          imageData8[index + 2] = b;
          imageData8[index + 3] = 255;
        }
      }

      // 5. 应用高斯模糊效果
      applyGaussianBlur(imageData8, canvas.width, height, 1);

      // 6. 将 ImageData 绘制到画布上
      ctx.putImageData(imageData, 0, 0);
    }
    else if (renderType === 'spectrumWithPitch') {
      renderSpectrumWithPitch(
        ctx,
        data,
        canvas.width,
        height,
        minValue,
        maxValue,
        dominantFreq,
        maxFreq || 2000,
        threshold
      );
    }
  }, [data, height, color, backgroundColor, minValue, maxValue, renderType, maxFreq, useColormap, highlightPeak, smoothingFactor, displayUnit, isEnergy, clearBeforeDraw, dominantFreq, threshold]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full h-full max-w-full"
      style={{ backgroundColor }}
    />
  );
}; 