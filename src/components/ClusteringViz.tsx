import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface ClusteringVizProps {
  isProcessing: boolean;
}

export const ClusteringViz: React.FC<ClusteringVizProps> = ({ isProcessing }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll('*').remove();

    // Generate random cluster data
    const clusters = [
      { label: '男性咳嗽', color: '#60A5FA' },
      { label: '女性咳嗽', color: '#F472B6' },
      { label: '儿童咳嗽', color: '#34D399' },
    ];

    clusters.forEach((cluster, i) => {
      const points = Array.from({ length: 10 }, () => ({
        x: Math.random() * width * 0.8 + width * 0.1,
        y: Math.random() * height * 0.8 + height * 0.1,
      }));

      svg.selectAll(`.cluster-${i}`)
        .data(points)
        .join('circle')
        .attr('class', `cluster-${i}`)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', 4)
        .attr('fill', cluster.color)
        .attr('opacity', 0.6);

      // Add label
      svg.append('text')
        .attr('x', width * 0.1 + (i * width * 0.3))
        .attr('y', height - 10)
        .attr('fill', cluster.color)
        .attr('font-size', '12px')
        .text(cluster.label);
    });

  }, [isProcessing]);

  return (
    <div className="relative w-full h-48 bg-gray-800 rounded-lg p-4">
      <svg
        ref={svgRef}
        className="w-full h-full"
      />
    </div>
  );
};