import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface NeuralNetworkVizProps {
  isProcessing: boolean;
}

interface Layer {
  name: string;
  nodes: number;
  label: string;
}

export const NeuralNetworkViz: React.FC<NeuralNetworkVizProps> = ({ isProcessing }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const layers: Layer[] = [
    { name: 'input', nodes: 4, label: 'Input' },
    { name: 'hidden1', nodes: 8, label: 'LSTM' },
    { name: 'hidden2', nodes: 4, label: 'Dense' },
    { name: 'output', nodes: 2, label: 'Output' }
  ];

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = { top: 10, right: 20, bottom: 10, left: 20 };

    svg.selectAll('*').remove();

    const layerWidth = (width - margin.left - margin.right) / (layers.length - 1);
    const maxNodes = Math.max(...layers.map(l => l.nodes));
    const nodeSpacing = Math.min(
      (height - margin.top - margin.bottom) / maxNodes,
      15
    );
    const nodeRadius = 3;

    layers.forEach((layer, i) => {
      if (i === layers.length - 1) return;
      const nextLayer = layers[i + 1];
      const x1 = margin.left + i * layerWidth;
      const x2 = margin.left + (i + 1) * layerWidth;

      const connectionSample = 0.5;

      Array.from({ length: layer.nodes }).forEach((_, nodeIndex) => {
        const y1 = margin.top + (height - margin.top - margin.bottom) / 2 +
          (nodeIndex - (layer.nodes - 1) / 2) * nodeSpacing;

        Array.from({ length: nextLayer.nodes }).forEach((_, nextNodeIndex) => {
          if (Math.random() > connectionSample) return;

          const y2 = margin.top + (height - margin.top - margin.bottom) / 2 +
            (nextNodeIndex - (nextLayer.nodes - 1) / 2) * nodeSpacing;

          svg.append('line')
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', '#4B5563')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.3);
        });
      });
    });

    layers.forEach((layer, i) => {
      const x = margin.left + i * layerWidth;
      const g = svg.append('g');

      g.append('text')
        .attr('x', x)
        .attr('y', margin.top)
        .attr('text-anchor', 'middle')
        .attr('fill', '#9CA3AF')
        .attr('font-size', '10px')
        .text(layer.label);

      Array.from({ length: layer.nodes }).forEach((_, j) => {
        const y = margin.top + (height - margin.top - margin.bottom) / 2 +
          (j - (layer.nodes - 1) / 2) * nodeSpacing;

        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', nodeRadius)
          .attr('fill', '#8B5CF6')
          .attr('opacity', 0.7);
      });
    });

  }, [isProcessing]);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="h-24 relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ background: '#1F2937' }}
        />
        {isProcessing && (
          <motion.div
            className="absolute inset-0 bg-purple-500/10"
            animate={{ opacity: [0, 0.2, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
};