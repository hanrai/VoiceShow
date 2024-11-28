import React, { useRef, useEffect } from 'react';

interface SpectrumVisualizerProps {
  data: Float32Array | null;
  height?: number;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  data,
  height = 48
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.fillStyle = '#0A0F1A';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 绘制频谱
    const barWidth = rect.width / (data.length / 4); // 只显示四分之一的频率范围
    const barGap = 1;
    const minDb = -100;
    const maxDb = 0;

    for (let i = 0; i < data.length / 4; i++) {
      const db = Math.max(minDb, Math.min(maxDb, data[i]));
      const normalized = (db - minDb) / (maxDb - minDb);
      const barHeight = normalized * rect.height;

      // 创建渐变
      const gradient = ctx.createLinearGradient(0, rect.height - barHeight, 0, rect.height);
      gradient.addColorStop(0, 'rgba(52, 211, 153, 0.8)'); // 绿色顶部
      gradient.addColorStop(1, 'rgba(52, 211, 153, 0.2)'); // 绿色底部

      ctx.fillStyle = gradient;
      ctx.fillRect(
        i * (barWidth + barGap),
        rect.height - barHeight,
        barWidth,
        barHeight
      );
    }
  }, [data]);

  return (
    <div className="h-full w-full bg-[#0A0F1A] rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}; 