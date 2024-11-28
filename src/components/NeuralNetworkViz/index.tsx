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
  const nodesRef = useRef<d3.Selection<SVGCircleElement, Node, SVGGElement, unknown>>();
  const linksRef = useRef<d3.Selection<SVGLineElement, Link, SVGGElement, unknown>>();

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

    // 创建连接（减少连接数量，只连接相邻的节点）
    for (let layer = 0; layer < layerSizes.length - 1; layer++) {
      for (let i = 0; i < layerSizes[layer]; i++) {
        const sourceNode = nodes.find(n => n.id === `${layer}-${i}`)!;
        const targetLayerNodes = nodes.filter(n => n.layer === layer + 1);

        targetLayerNodes.forEach(targetNode => {
          const distance = Math.abs(sourceNode.index / layerSizes[layer] - targetNode.index / layerSizes[layer + 1]);
          if (distance < 0.5) { // 只连接相对位置接近的节点
            links.push({
              source: sourceNode.id,
              target: targetNode.id,
              value: Math.random() * 0.5 + 0.5 // 权重在 0.5-1 之间
            });
          }
        });
      }
    }

    return { nodes, links };
  }, [mfccData]);

  // 初始化 SVG
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const layerWidth = width / 6;
    const nodeRadius = 4;

    // 创建连接组和节点组
    const linkGroup = svg.append('g');
    const nodeGroup = svg.append('g');

    // 绘制连接
    linksRef.current = linkGroup
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(96, 165, 250, 0.2)')
      .attr('stroke-width', d => d.value);

    // 绘制节点
    nodesRef.current = nodeGroup
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', nodeRadius)
      .attr('fill', isProcessing ? 'rgb(52, 211, 153)' : 'rgb(96, 165, 250)');

    // 更新位置
    const updatePositions = () => {
      linksRef.current!
        .attr('x1', d => {
          const source = nodes.find(n => n.id === d.source)!;
          return layerWidth * (source.layer + 1);
        })
        .attr('y1', d => {
          const source = nodes.find(n => n.id === d.source)!;
          const layerNodes = nodes.filter(n => n.layer === source.layer);
          return height * ((source.index + 1) / (layerNodes.length + 1));
        })
        .attr('x2', d => {
          const target = nodes.find(n => n.id === d.target)!;
          return layerWidth * (target.layer + 1);
        })
        .attr('y2', d => {
          const target = nodes.find(n => n.id === d.target)!;
          const layerNodes = nodes.filter(n => n.layer === target.layer);
          return height * ((target.index + 1) / (layerNodes.length + 1));
        });

      nodesRef.current!
        .attr('cx', d => layerWidth * (d.layer + 1))
        .attr('cy', d => {
          const layerNodes = nodes.filter(n => n.layer === d.layer);
          return height * ((d.index + 1) / (layerNodes.length + 1));
        })
        .attr('opacity', d => Math.abs(d.value));
    };

    updatePositions();

    // 添加动画效果
    if (isProcessing) {
      const pulseNodes = () => {
        nodesRef.current!
          .transition()
          .duration(1000)
          .attr('r', nodeRadius * 1.5)
          .transition()
          .duration(1000)
          .attr('r', nodeRadius)
          .on('end', pulseNodes);
      };

      const pulseLinks = () => {
        linksRef.current!
          .transition()
          .duration(1000)
          .attr('stroke', 'rgba(96, 165, 250, 0.4)')
          .transition()
          .duration(1000)
          .attr('stroke', 'rgba(96, 165, 250, 0.2)')
          .on('end', pulseLinks);
      };

      pulseNodes();
      pulseLinks();
    }

    return () => {
      svg.selectAll('*').interrupt(); // 停止所有动画
    };
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