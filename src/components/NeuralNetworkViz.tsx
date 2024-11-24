import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface NeuralNetworkVizProps {
  isProcessing: boolean;
}

export const NeuralNetworkViz: React.FC<NeuralNetworkVizProps> = ({ isProcessing }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const layers = [4, 8, 6, 4];

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    svg.selectAll('*').remove();

    // Calculate positions
    const layerWidth = width / (layers.length - 1);
    const getNodeY = (layer: number, node: number) => {
      const layerHeight = height / (layers[layer] + 1);
      return layerHeight * (node + 1);
    };

    // Draw connections
    layers.forEach((nodeCount, layerIndex) => {
      if (layerIndex === layers.length - 1) return;
      
      const nextLayerNodes = layers[layerIndex + 1];
      
      for (let node = 0; node < nodeCount; node++) {
        for (let nextNode = 0; nextNode < nextLayerNodes; nextNode++) {
          svg.append('line')
            .attr('x1', layerIndex * layerWidth)
            .attr('y1', getNodeY(layerIndex, node))
            .attr('x2', (layerIndex + 1) * layerWidth)
            .attr('y2', getNodeY(layerIndex + 1, nextNode))
            .attr('stroke', '#4B5563')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.3);
        }
      }
    });

    // Draw nodes
    layers.forEach((nodeCount, layerIndex) => {
      for (let node = 0; node < nodeCount; node++) {
        svg.append('circle')
          .attr('cx', layerIndex * layerWidth)
          .attr('cy', getNodeY(layerIndex, node))
          .attr('r', 4)
          .attr('fill', '#8B5CF6')
          .attr('opacity', 0.7);
      }
    });
  }, [isProcessing]);

  return (
    <div className="relative w-full h-64 bg-gray-800/50 rounded-lg overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
      />
      {isProcessing && (
        <motion.div
          className="absolute inset-0 bg-purple-500/10"
          animate={{ opacity: [0, 0.2, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  );
};