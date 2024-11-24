import React, { useEffect, useRef } from 'react';

interface SpectrogramViewProps {
  data: Float32Array | null;
}

export const SpectrogramView: React.FC<SpectrogramViewProps> = ({ data }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制频谱图
    const bufferLength = data.length;
    const barWidth = canvas.width / bufferLength;
    const barHeightScale = canvas.height / 2;

    ctx.beginPath();
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = Math.abs(data[i]) * barHeightScale;
      const x = i * barWidth;
      const y = canvas.height / 2 - barHeight / 2;

      ctx.fillStyle = `hsl(${(i / bufferLength) * 240}, 100%, 50%)`;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [data]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="w-full rounded-lg"
      />
    </div>
  );
};