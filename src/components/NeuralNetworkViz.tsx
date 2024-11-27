import React, { useMemo } from 'react';

interface NeuralNetworkVizProps {
  isProcessing: boolean;
  mfccData?: number[];
}

export const NeuralNetworkViz: React.FC<NeuralNetworkVizProps> = ({
  isProcessing,
  mfccData = []
}) => {
  // 获取MFCC通道的值
  const getMfccValue = (channelIndex: number) => {
    const index = channelIndex % mfccData.length;
    const value = mfccData[index] || 0;
    // 标准化到0-1范围
    return (value + 100) / 200;
  };

  // 获取MFCC通道的能量强度
  const getMfccEnergy = (channelIndex: number) => {
    const value = getMfccValue(channelIndex);
    return Math.pow(value, 2);
  };

  // 生成随机明暗度
  const getRandomBrightness = (seed: number) => {
    // 使用种子生成0.3-1.0之间的伪随机数
    const random = Math.abs(Math.sin(seed * 12345));
    return 0.3 + random * 0.7;
  };

  // 获取连线的透明度
  const getConnectionAlpha = (elementIndex: number, brightness: number) => {
    // 为每条连线选择特定的MFCC通道
    const primaryChannel = elementIndex % mfccData.length;
    const secondaryChannel = (elementIndex + 3) % mfccData.length;

    // 获取两个通道的能量
    const primaryEnergy = getMfccEnergy(primaryChannel);
    const secondaryEnergy = getMfccEnergy(secondaryChannel);

    // 组合能量值，主通道权重更大
    const combinedEnergy = primaryEnergy * 0.7 + secondaryEnergy * 0.3;

    // 应用随机明暗度和基础透明度
    return (0.1 + combinedEnergy * 0.6) * brightness;
  };

  // 统一的颜色计算函数
  const getElementColor = (elementIndex: number, brightness: number = 1, isConnection: boolean = false) => {
    // 使用固定的通道分配
    const hueChannel = elementIndex % 3;
    const saturationChannel = (elementIndex + 1) % 3;
    const lightnessChannel = (elementIndex + 2) % 3;

    // 获取各个通道的值
    const hueValue = getMfccValue(hueChannel);
    const saturationValue = getMfccValue(saturationChannel);
    const lightnessValue = getMfccValue(lightnessChannel);

    // 计算颜色参数
    const hue = (elementIndex * 120 + hueValue * 60) % 360;
    const saturation = 50 + saturationValue * 30;
    const lightness = 30 + lightnessValue * 30;

    // 根据元素类型选择透明度计算方式
    const alpha = isConnection
      ? getConnectionAlpha(elementIndex, brightness)
      : (0.15 + getMfccEnergy(hueChannel) * 0.5) * brightness;

    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  };

  // 定义网络结构
  const networkStructure = useMemo(() => {
    return {
      layers: [
        { name: 'Input', nodes: 5, xRatio: 0.12 },
        { name: 'LSTM', nodes: 6, xRatio: 0.38 },
        { name: 'Dense', nodes: 4, xRatio: 0.62 },
        { name: 'Output', nodes: 2, xRatio: 0.88 }
      ]
    };
  }, []);

  // 计算节点位置
  const getNodePositions = (layer: { nodes: number }) => {
    const totalHeight = 50;
    const margin = 8;
    const usableHeight = totalHeight - 2 * margin;
    const spacing = usableHeight / (layer.nodes + 1);
    return Array(layer.nodes).fill(0).map((_, i) => margin + spacing * (i + 1));
  };

  // 生成连接和颜色
  const { connections, nodeIndices } = useMemo(() => {
    const allConnections: {
      x1Ratio: number;
      y1: number;
      x2Ratio: number;
      y2: number;
      elementIndex: number;
      brightness: number;
    }[] = [];

    const allNodeIndices: { [key: string]: number } = {};
    let elementIndex = 0;

    // 生成层间连接
    for (let i = 0; i < networkStructure.layers.length - 1; i++) {
      const fromLayer = networkStructure.layers[i];
      const toLayer = networkStructure.layers[i + 1];
      const fromPositions = getNodePositions(fromLayer);
      const toPositions = getNodePositions(toLayer);

      fromPositions.forEach((fromY, fromIndex) => {
        toPositions.forEach((toY, toIndex) => {
          allConnections.push({
            x1Ratio: fromLayer.xRatio,
            y1: fromY,
            x2Ratio: toLayer.xRatio,
            y2: toY,
            elementIndex: elementIndex++,
            brightness: getRandomBrightness(elementIndex)
          });
        });
      });
    }

    // 为每个节点生成颜色索引
    networkStructure.layers.forEach((layer, layerIndex) => {
      const positions = getNodePositions(layer);
      positions.forEach((_, nodeIndex) => {
        const nodeKey = `${layerIndex}-${nodeIndex}`;
        allNodeIndices[nodeKey] = elementIndex++;
      });
    });

    return {
      connections: allConnections,
      nodeIndices: allNodeIndices
    };
  }, [networkStructure]);

  return (
    <div className="w-full h-[200px] bg-gray-800 rounded-lg p-2">
      <svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="xMidYMid meet">
        {/* 连接线 */}
        <g>
          {connections.map((conn, idx) => (
            <path
              key={idx}
              d={`M ${conn.x1Ratio * 100} ${conn.y1} 
                 C ${(conn.x1Ratio * 100 + conn.x2Ratio * 100) / 2} ${conn.y1},
                   ${(conn.x1Ratio * 100 + conn.x2Ratio * 100) / 2} ${conn.y2},
                   ${conn.x2Ratio * 100} ${conn.y2}`}
              stroke={getElementColor(conn.elementIndex, conn.brightness, true)}
              strokeWidth="0.4"
              fill="none"
              className="transition-colors duration-300"
              style={{
                filter: isProcessing ? 'url(#glow)' : 'none'
              }}
            />
          ))}
        </g>

        {/* 发光效果滤镜 */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 节点 */}
        {networkStructure.layers.map((layer, layerIndex) => {
          const positions = getNodePositions(layer);
          return (
            <g key={layerIndex}>
              {/* 层标签 */}
              <text
                x={layer.xRatio * 100}
                y={5}
                textAnchor="middle"
                className="text-[3px] fill-gray-400"
              >
                {layer.name}
              </text>
              {/* 节点 */}
              {positions.map((y, nodeIndex) => {
                const nodeKey = `${layerIndex}-${nodeIndex}`;
                return (
                  <circle
                    key={nodeIndex}
                    cx={layer.xRatio * 100}
                    cy={y}
                    r={1.5}
                    fill={getElementColor(nodeIndices[nodeKey])}
                    className="transition-colors duration-300"
                    style={{
                      filter: isProcessing ? 'url(#glow)' : 'none'
                    }}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};