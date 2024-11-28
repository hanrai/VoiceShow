import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';

interface NeuralNetworkVizProps {
  isProcessing: boolean;
  mfccData: number[];
}

interface Node {
  id: string;
  layer: number;
  index: number;
  value: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

export const NeuralNetworkViz: React.FC<NeuralNetworkVizProps> = ({
  isProcessing,
  mfccData
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // 生成网络数据
  const { nodes, links } = useMemo(() => {
    const layerSizes = [13, 8, 6, 4, 6]; // 网络层大小
    const nodes: Node[] = [];
    const links: Link[] = [];

    // 创建节点
    layerSizes.forEach((size, layer) => {
      for (let i = 0; i < size; i++) {
        nodes.push({
          id: `${layer}-${i}`,
          layer,
          index: i,
          value: layer === 0 && i < mfccData.length ? mfccData[i] : 0
        });
      }
    });

    // 创建连接
    for (let layer = 0; layer < layerSizes.length - 1; layer++) {
      for (let i = 0; i < layerSizes[layer]; i++) {
        for (let j = 0; j < layerSizes[layer + 1]; j++) {
          links.push({
            source: `${layer}-${i}`,
            target: `${layer + 1}-${j}`,
            value: Math.random() // 模拟权重
          });
        }
      }
    }

    return { nodes, links };
  }, [mfccData]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 清空 SVG
    svg.selectAll('*').remove();

    // 创建布局
    const layerWidth = width / 6;
    const nodeRadius = 4;

    // 绘制连接
    const linkGroup = svg.append('g');
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source)!;
      const target = nodes.find(n => n.id === link.target)!;

      const x1 = layerWidth * (source.layer + 1);
      const y1 = height * ((source.index + 1) / (nodes.filter(n => n.layer === source.layer).length + 1));
      const x2 = layerWidth * (target.layer + 1);
      const y2 = height * ((target.index + 1) / (nodes.filter(n => n.layer === target.layer).length + 1));

      linkGroup
        .append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', 'rgba(96, 165, 250, 0.2)')
        .attr('stroke-width', Math.abs(link.value));
    });

    // 绘制节点
    const nodeGroup = svg.append('g');
    nodes.forEach(node => {
      const layerNodes = nodes.filter(n => n.layer === node.layer);
      const x = layerWidth * (node.layer + 1);
      const y = height * ((node.index + 1) / (layerNodes.length + 1));

      nodeGroup
        .append('circle')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', nodeRadius)
        .attr('fill', isProcessing ? 'rgb(52, 211, 153)' : 'rgb(96, 165, 250)')
        .attr('opacity', Math.abs(node.value));
    });
  }, [nodes, links, isProcessing]);

  return (
    <div className="w-full h-32 bg-[#0A0F1A] rounded-xl overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};