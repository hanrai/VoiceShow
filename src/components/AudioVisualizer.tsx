import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  data: Float32Array;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<Float32Array[]>([]);
  const MAX_HISTORY = 10 * 48; // 10秒 * 48帧/秒

  useEffect(() => {
    // 更新历史数据
    historyRef.current.push(new Float32Array(data));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制波形
    const sliceWidth = canvas.width / MAX_HISTORY;
    const centerY = canvas.height / 2;
    const amplitudeScale = canvas.height * 0.45; // 留出一些边距

    ctx.beginPath();
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;

    // 绘制历史数据
    historyRef.current.forEach((frameData, frameIndex) => {
      // 计算每帧的平均振幅
      const amplitude = frameData.reduce((sum, val) => sum + Math.abs(val), 0) / frameData.length;

      const x = frameIndex * sliceWidth;
      const y = centerY + (amplitude * amplitudeScale);

      if (frameIndex === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // 添加渐变效果
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(96, 165, 250, 0)');
    gradient.addColorStop(0.1, 'rgba(96, 165, 250, 1)');
    gradient.addColorStop(1, 'rgba(96, 165, 250, 1)');

    ctx.strokeStyle = gradient;
    ctx.stroke();

  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={64}
      className="w-full h-full"
    />
  );
};