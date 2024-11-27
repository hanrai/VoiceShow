import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Circle, Arrow, Text, Line } from 'react-konva';

interface CoughVisualizationProps {
  features: number[];
  isProcessing: boolean;
  detectionResult: boolean;
}

export const CoughVisualization: React.FC<CoughVisualizationProps> = ({
  features,
  isProcessing,
  detectionResult
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);
  const stageHeight = 160;
  const centerY = stageHeight / 2;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setStageWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 创建动态特征点
  const getFeaturePoints = () => {
    if (!features.length) return [];

    const points: { x: number, y: number }[] = [];
    const step = (stageWidth - 200) / features.length;

    features.forEach((feature, i) => {
      points.push({
        x: 100 + i * step,
        y: centerY + (feature * 30)
      });
    });

    return points;
  };

  return (
    <div ref={containerRef} className="cough-visualization w-full">
      <Stage width={stageWidth} height={stageHeight}>
        <Layer>
          {/* 1. 音频输入动态显示 */}
          <Circle
            x={50}
            y={centerY}
            radius={30}
            fill={isProcessing ? "#ffd700" : "#e3e3e3"}
          />
          <Text text="输入" x={30} y={centerY + 40} />

          {/* 2. 特征提取可视化 */}
          {getFeaturePoints().map((point, i) => (
            <React.Fragment key={i}>
              <Circle
                x={point.x}
                y={point.y}
                radius={4}
                fill="#b8e6ff"
                opacity={0.8}
              />
              {i > 0 && (
                <Line
                  points={[
                    getFeaturePoints()[i - 1].x,
                    getFeaturePoints()[i - 1].y,
                    point.x,
                    point.y
                  ]}
                  stroke="#b8e6ff"
                  opacity={0.5}
                />
              )}
            </React.Fragment>
          ))}

          {/* 3. 结果显示 */}
          <Circle
            x={stageWidth - 50}
            y={centerY}
            radius={30}
            fill={detectionResult ? "#ff6b6b" : "#95d5b2"}
            shadowBlur={detectionResult ? 20 : 0}
            shadowColor={detectionResult ? "#ff0000" : "transparent"}
          />
          <Text
            text={detectionResult ? "咳嗽" : "正常"}
            x={stageWidth - 70}
            y={centerY + 40}
            fill={detectionResult ? "#ff6b6b" : "#95d5b2"}
            fontSize={14}
            fontStyle="bold"
          />

          {/* 连接线 */}
          <Arrow
            points={[80, centerY, 120, centerY]}
            fill="#666"
            stroke="#666"
          />
          <Arrow
            points={[
              stageWidth - 120,
              centerY,
              stageWidth - 80,
              centerY
            ]}
            fill="#666"
            stroke="#666"
          />
        </Layer>
      </Stage>
    </div>
  );
}; 