import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Circle, Arrow, Text, Line, Rect, Group } from 'react-konva';
import { AudioEvent } from './CoughVAD';

interface CoughVisualizationProps {
  features: number[];
  isProcessing: boolean;
  currentEvent: AudioEvent | null;
}

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface EventZone {
  type: AudioEvent['type'];
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
}

export const CoughVisualization: React.FC<CoughVisualizationProps> = ({
  features,
  isProcessing,
  currentEvent
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(800);
  const stageHeight = 160;
  const [trailPoints, setTrailPoints] = useState<Point[]>([]);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [zoneOpacity, setZoneOpacity] = useState(0);

  // 定义事件区域
  const eventZones: EventZone[] = [
    { type: 'cough', x: stageWidth * 0.3, y: stageHeight * 0.7, radius: 40, color: '#F44336', label: '咳嗽' },
    { type: 'speech', x: stageWidth * 0.5, y: stageHeight * 0.3, radius: 40, color: '#4CAF50', label: '语音' },
    { type: 'noise', x: stageWidth * 0.7, y: stageHeight * 0.7, radius: 40, color: '#FF9800', label: '噪声' }
  ];

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

  // 更新追踪点和轨迹
  useEffect(() => {
    if (currentEvent) {
      const zone = eventZones.find(z => z.type === currentEvent.type);
      if (zone) {
        // 添加新的追踪点
        const newPoint: Point = {
          x: zone.x,
          y: zone.y,
          timestamp: Date.now()
        };

        setTrailPoints(prev => [...prev, newPoint].slice(-50)); // 保留最近的50个点
        setActiveZone(currentEvent.type);
        setZoneOpacity(1);

        // 激活动画
        const fadeOut = setTimeout(() => {
          setZoneOpacity(0);
        }, 1000);

        return () => clearTimeout(fadeOut);
      }
    }
  }, [currentEvent]);

  const renderEventZones = () => {
    return eventZones.map((zone, index) => (
      <Group key={index}>
        <Circle
          x={zone.x}
          y={zone.y}
          radius={zone.radius}
          fill={zone.color}
          opacity={zone.type === activeZone ? 0.3 + zoneOpacity * 0.7 : 0.1}
          shadowBlur={zone.type === activeZone ? 20 : 0}
          shadowColor={zone.color}
          shadowOpacity={zoneOpacity}
        />
        <Text
          text={zone.label}
          x={zone.x - 20}
          y={zone.y + zone.radius + 5}
          fontSize={12}
          fill="#999"
          align="center"
          width={40}
        />
      </Group>
    ));
  };

  const renderTrail = () => {
    if (trailPoints.length < 2) return null;

    const points: number[] = [];
    trailPoints.forEach(point => {
      points.push(point.x, point.y);
    });

    return (
      <Line
        points={points}
        stroke="#666"
        strokeWidth={2}
        opacity={0.5}
        tension={0.3}
        lineCap="round"
        lineJoin="round"
      />
    );
  };

  const renderCurrentPoint = () => {
    if (!currentEvent || trailPoints.length === 0) return null;

    const lastPoint = trailPoints[trailPoints.length - 1];
    return (
      <Circle
        x={lastPoint.x}
        y={lastPoint.y}
        radius={6}
        fill="#fff"
        shadowBlur={10}
        shadowColor="#fff"
        opacity={0.8}
      />
    );
  };

  return (
    <div ref={containerRef} className="cough-visualization w-full">
      <Stage width={stageWidth} height={stageHeight}>
        <Layer>
          {renderEventZones()}
          {renderTrail()}
          {renderCurrentPoint()}
        </Layer>
      </Stage>
    </div>
  );
}; 