import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Circle, Path, Group, Text, Rect } from 'react-konva';
import { AudioEvent } from './CoughVAD';

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface EventSpace {
  id: AudioEvent['type'];
  label: string;
  color: string;
  angle: number;
}

interface EventSpaceVizProps {
  currentEvent: AudioEvent | null;
  width?: number;
  height?: number;
}

export const EventSpaceViz: React.FC<EventSpaceVizProps> = ({
  currentEvent,
  width = 800,
  height = 160
}) => {
  const [points, setPoints] = useState<Point[]>([]);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  const eventSpaces: EventSpace[] = [
    { id: 'cough', label: '咳嗽', color: '#F44336', angle: Math.PI * 0.25 },
    { id: 'speech', label: '语音', color: '#4CAF50', angle: Math.PI * 1.25 },
    { id: 'noise', label: '噪声', color: '#FF9800', angle: Math.PI * 0.75 }
  ];

  const calculatePosition = (event: AudioEvent): Point => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;

    const eventSpace = eventSpaces.find(space => space.id === event.type);
    if (!eventSpace) return { x: centerX, y: centerY, timestamp: Date.now() };

    const distanceFromCenter = radius * (0.3 + event.confidence * 0.7);

    const x = centerX + Math.cos(eventSpace.angle) * distanceFromCenter;
    const y = centerY + Math.sin(eventSpace.angle) * distanceFromCenter;

    return { x, y, timestamp: Date.now() };
  };

  useEffect(() => {
    if (currentEvent) {
      const newPoint = calculatePosition(currentEvent);
      setCurrentPoint(newPoint);
      setPoints(prev => [...prev, newPoint].slice(-50)); // 保留最近的50个点
    }
  }, [currentEvent]);

  const renderBackground = () => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;

    return (
      <>
        {/* 背景圆 */}
        <Circle
          x={centerX}
          y={centerY}
          radius={radius}
          stroke="#666"
          opacity={0.2}
        />
        <Circle
          x={centerX}
          y={centerY}
          radius={radius * 0.7}
          stroke="#666"
          opacity={0.15}
        />
        <Circle
          x={centerX}
          y={centerY}
          radius={radius * 0.4}
          stroke="#666"
          opacity={0.1}
        />

        {/* 事件空间 */}
        {eventSpaces.map((space, index) => {
          const x = centerX + Math.cos(space.angle) * radius * 0.8;
          const y = centerY + Math.sin(space.angle) * radius * 0.8;

          return (
            <Group key={index}>
              <Circle
                x={x}
                y={y}
                radius={30}
                fill={space.color}
                opacity={0.1}
              />
              <Text
                text={space.label}
                x={x - 20}
                y={y + 35}
                width={40}
                align="center"
                fontSize={12}
                fill="#999"
              />
            </Group>
          );
        })}
      </>
    );
  };

  const renderTrail = () => {
    if (points.length < 2) return null;

    const linePoints = points.flatMap(p => [p.x, p.y]);
    return (
      <Path
        data={`M ${linePoints.join(' ')}`}
        stroke="#666"
        strokeWidth={2}
        opacity={0.3}
        tension={0.3}
        lineCap="round"
        lineJoin="round"
      />
    );
  };

  const renderCurrentPoint = () => {
    if (!currentPoint || !currentEvent) return null;

    const eventSpace = eventSpaces.find(space => space.id === currentEvent.type);
    if (!eventSpace) return null;

    return (
      <Group>
        <Circle
          x={currentPoint.x}
          y={currentPoint.y}
          radius={8}
          fill={eventSpace.color}
          shadowBlur={10}
          shadowColor={eventSpace.color}
          opacity={0.8}
        />
        <Circle
          x={currentPoint.x}
          y={currentPoint.y}
          radius={12}
          stroke={eventSpace.color}
          opacity={0.2}
        />
      </Group>
    );
  };

  return (
    <Stage width={width} height={height}>
      <Layer>
        {renderBackground()}
        {renderTrail()}
        {renderCurrentPoint()}
      </Layer>
    </Stage>
  );
}; 