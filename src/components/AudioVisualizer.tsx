import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  data: Float32Array;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 完全清除背景（使用透明背景）
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制波形
    const sliceWidth = canvas.width / data.length;
    const centerY = canvas.height / 2;

    ctx.beginPath();
    ctx.strokeStyle = '#60A5FA'; // 蓝色波形
    ctx.lineWidth = 2;

    data.forEach((value, i) => {
      const x = i * sliceWidth;
      const y = centerY + (value * centerY);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

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