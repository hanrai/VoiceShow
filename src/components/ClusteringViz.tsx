import React, { useEffect, useRef, useState } from 'react';
import { KMeans } from '../utils/kmeans';

interface ClusteringVizProps {
  mfccData: number[];
  pitchData: number[];
  timestamp: number;
}

export const ClusteringViz: React.FC<ClusteringVizProps> = ({
  mfccData,
  pitchData,
  timestamp
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ features: number[], timestamp: number }[]>([]);
  const kmeans = useRef(new KMeans(3, 10));
  const colors = ['#60A5FA', '#34D399', '#F87171'];

  useEffect(() => {
    if (!mfccData.length || !pitchData.length) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 准备特征向量（使用前两个MFCC系数和音高）
    const features = [
      mfccData[0] / 80, // 归一化MFCC
      mfccData[1] / 80,
      pitchData[0] / 400 // 归一化音高
    ];

    // 添加新点
    pointsRef.current.push({ features, timestamp });

    // 保持最近10秒的数据
    const cutoffTime = timestamp - 10000;
    pointsRef.current = pointsRef.current.filter(p => p.timestamp > cutoffTime);

    // 执行聚类
    const clusters = kmeans.current.cluster(pointsRef.current);

    // 绘制
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制点和质心
    clusters.forEach((cluster, i) => {
      const color = colors[i];

      // 绘制点
      cluster.points.forEach(point => {
        const x = point.features[0] * canvas.width;
        const y = point.features[1] * canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });

      // 绘制质心
      if (cluster.points.length > 0) {
        const x = cluster.centroid[0] * canvas.width;
        const y = cluster.centroid[1] * canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

  }, [mfccData, pitchData, timestamp]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="w-full rounded-lg"
      />
    </div>
  );
};