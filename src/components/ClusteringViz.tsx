import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { KMeans } from '../utils/kmeans';

interface ClusteringVizProps {
  mfccData: number[];
  pitchData: number;
  loudnessData: number;
  timestamp: number;
  vadStatus: boolean;
}

export const ClusteringViz: React.FC<ClusteringVizProps> = ({
  mfccData,
  pitchData,
  loudnessData,
  timestamp,
  vadStatus
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pointsRef = useRef<{ features: number[], timestamp: number }[]>([]);
  const kmeans = useRef(new KMeans(3, 10));
  const colors = ['#60A5FA', '#34D399', '#F87171'];

  const featureVector = useMemo(() => {
    return [
      ...mfccData,
      pitchData || 0,
      loudnessData || 0,
      vadStatus ? 1 : 0
    ];
  }, [mfccData, pitchData, loudnessData, vadStatus]);

  useEffect(() => {
    if (!mfccData?.length || !svgRef.current) return;
    if (mfccData.length < 4) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = { top: 5, right: 5, bottom: 5, left: 5 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    try {
      const features = [
        mfccData[0] / 80 || 0,
        mfccData[1] / 80 || 0,
        mfccData[2] / 80 || 0,
        mfccData[3] / 80 || 0,
        pitchData / 400,
        (loudnessData + 60) / 60,
        Math.abs(mfccData[0] - (pointsRef.current[pointsRef.current.length - 1]?.features[0] || mfccData[0])) || 0,
        Math.abs(mfccData[1] - (pointsRef.current[pointsRef.current.length - 1]?.features[1] || mfccData[1])) || 0
      ];

      pointsRef.current.push({ features, timestamp });
      const cutoffTime = timestamp - 10000;
      pointsRef.current = pointsRef.current.filter(p => p.timestamp > cutoffTime);

      if (pointsRef.current.length < 3) return;

      const clusters = kmeans.current.cluster(pointsRef.current);
      svg.selectAll('*').remove();

      const plot = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // 计算2D投影并找到边界
      const points2D = pointsRef.current.map(point => ({
        x: point.features[0] * 0.6 + point.features[1] * 0.4,
        y: point.features[2] * 0.6 + point.features[3] * 0.4,
        features: point.features
      }));

      // 创建比例尺
      const xExtent = d3.extent(points2D, d => d.x) as [number, number];
      const yExtent = d3.extent(points2D, d => d.y) as [number, number];

      // 增加边距比例
      const padding = 0.2;
      const xRange = xExtent[1] - xExtent[0] || 1;
      const yRange = yExtent[1] - yExtent[0] || 1;

      const xScale = d3.scaleLinear()
        .domain([
          xExtent[0] - xRange * padding,
          xExtent[1] + xRange * padding
        ])
        .range([0, plotWidth]);

      const yScale = d3.scaleLinear()
        .domain([
          yExtent[0] - yRange * padding,
          yExtent[1] + yRange * padding
        ])
        .range([plotHeight, 0]);

      // 绘制聚类
      clusters.forEach((cluster, i) => {
        const color = colors[i];

        if (cluster.points.length > 1) {
          const clusterPoints2D = cluster.points
            .map(p => points2D.find(p2d => p2d.features === p.features))
            .filter((p): p is { x: number; y: number; features: number[] } => p !== undefined);

          // 减小连接线的数量
          const samplePoints = clusterPoints2D.filter(() => Math.random() < 0.5);

          samplePoints.forEach(point => {
            plot.append('line')
              .attr('x1', xScale(point.x))
              .attr('y1', yScale(point.y))
              .attr('x2', xScale(cluster.centroid[0]))
              .attr('y2', yScale(cluster.centroid[1]))
              .attr('stroke', color)
              .attr('stroke-width', 0.5)
              .attr('stroke-opacity', 0.1);
          });
        }

        // 绘制点
        cluster.points.forEach(point => {
          const point2D = points2D.find(p2d => p2d.features === point.features);
          if (!point2D) return;

          plot.append('circle')
            .attr('cx', xScale(point2D.x))
            .attr('cy', yScale(point2D.y))
            .attr('r', 3)
            .attr('fill', color)
            .attr('fill-opacity', 0.7);
        });

        // 绘制质心
        if (cluster.points.length > 0) {
          plot.append('circle')
            .attr('cx', xScale(cluster.centroid[0]))
            .attr('cy', yScale(cluster.centroid[1]))
            .attr('r', 4)
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('fill', 'none');
        }
      });
    } catch (error) {
      console.error('Error in ClusteringViz:', error);
    }
  }, [mfccData, pitchData, loudnessData, timestamp, vadStatus]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="h-24">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${800} ${96}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          style={{ background: '#1F2937' }}
        />
      </div>
    </div>
  );
};