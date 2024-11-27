import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Circle, Text, Line, Group } from 'react-konva';
import { AudioEvent } from './CoughVAD';

interface CoughVisualizationProps {
  features: number[];
  isProcessing: boolean;
  currentEvent: AudioEvent | null;
  eventConfidences?: { type: AudioEvent['type']; confidence: number; }[];
}

interface Point {
  x: number;
  y: number;
  timestamp: number;
  color: string;
  vx?: number; // x方向速度
  vy?: number; // y方向速度
}

interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
}

interface EventZone {
  type: AudioEvent['type'];
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
  angle: number;
}

const EVENT_COLORS = {
  cough: '#F44336',
  speech: '#4CAF50',
  noise: '#FF9800',
  laugh: '#E91E63',
  sneeze: '#2196F3',
  breath: '#9C27B0'
};

const SILENCE_COLOR = '#666666';
const CONFIDENCE_THRESHOLD = 0.2; // 事件触发的最小置信度阈值
const SPRING_STRENGTH = 0.1; // 弹性系数
const DAMPING = 0.95; // 阻尼系数
const RANDOM_FORCE = 0.2; // 随机力度
const MAX_SPEED = 5; // 最大速度限制

export const CoughVisualization: React.FC<CoughVisualizationProps> = ({
  features,
  isProcessing,
  currentEvent,
  eventConfidences
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [trailPoints, setTrailPoints] = useState<Point[]>([]);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const physicsRef = useRef<PhysicsState>({
    x: dimensions.width / 2,
    y: dimensions.height / 2,
    vx: 0,
    vy: 0,
    targetX: dimensions.width / 2,
    targetY: dimensions.height / 2
  });

  // 计算中心点
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height / 2;
  const baseRadius = Math.min(dimensions.width, dimensions.height) * 0.3;

  // 定义事件区域
  const eventZones: EventZone[] = Object.entries(EVENT_COLORS).map(([type, color], index, array) => {
    const angle = (index * 2 * Math.PI) / array.length;
    return {
      type: type as AudioEvent['type'],
      x: centerX + Math.cos(angle) * baseRadius,
      y: centerY + Math.sin(angle) * baseRadius,
      radius: 40,
      color,
      label: type,
      angle
    };
  });

  // 添加随机扰动
  const addRandomForce = () => {
    const angle = Math.random() * Math.PI * 2;
    const magnitude = Math.random() * RANDOM_FORCE;
    return {
      x: Math.cos(angle) * magnitude,
      y: Math.sin(angle) * magnitude
    };
  };

  // 应用物理效果
  const applyPhysics = (target: { x: number, y: number }) => {
    const physics = physicsRef.current;
    const randomForce = addRandomForce();

    // 计算弹性力
    const dx = target.x - physics.x;
    const dy = target.y - physics.y;
    const springForceX = dx * SPRING_STRENGTH;
    const springForceY = dy * SPRING_STRENGTH;

    // 更新速度
    physics.vx = (physics.vx + springForceX + randomForce.x) * DAMPING;
    physics.vy = (physics.vy + springForceY + randomForce.y) * DAMPING;

    // 限制最大速度
    const speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      physics.vx *= scale;
      physics.vy *= scale;
    }

    // 更新位置
    physics.x += physics.vx;
    physics.y += physics.vy;

    return { x: physics.x, y: physics.y };
  };

  // 计算追踪点位置
  const calculateTrackingPoint = (confidences: { type: AudioEvent['type']; confidence: number; }[]) => {
    const activeConfidences = confidences.filter(c => c.confidence >= CONFIDENCE_THRESHOLD);

    let targetPoint;
    if (activeConfidences.length === 0) {
      targetPoint = { x: centerX, y: centerY };
    } else {
      const totalWeight = activeConfidences.reduce((sum, c) => sum + c.confidence, 0);
      let weightedX = centerX;
      let weightedY = centerY;
      let maxConfidence = 0;
      let dominantColor = SILENCE_COLOR;

      activeConfidences.forEach(conf => {
        const zone = eventZones.find(z => z.type === conf.type);
        if (zone) {
          const weight = conf.confidence / totalWeight;
          weightedX += (zone.x - centerX) * weight;
          weightedY += (zone.y - centerY) * weight;

          if (conf.confidence > maxConfidence) {
            maxConfidence = conf.confidence;
            dominantColor = zone.color;
          }
        }
      });

      targetPoint = { x: weightedX, y: weightedY };
      physicsRef.current.targetX = weightedX;
      physicsRef.current.targetY = weightedY;
    }

    // 应用物理效果
    const physicsPoint = applyPhysics(targetPoint);

    return {
      x: physicsPoint.x,
      y: physicsPoint.y,
      color: activeConfidences.length === 0 ? SILENCE_COLOR :
        eventZones.find(z => z.type === activeConfidences[0].type)?.color || SILENCE_COLOR
    };
  };

  // 动画循环
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      if (eventConfidences) {
        const { x, y, color } = calculateTrackingPoint(eventConfidences);

        const newPoint: Point = {
          x,
          y,
          color,
          timestamp: Date.now(),
          vx: physicsRef.current.vx,
          vy: physicsRef.current.vy
        };

        setTrailPoints(prev => [...prev, newPoint].slice(-50));
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [eventConfidences, dimensions]);

  // 更新容器尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth,
          height: Math.max(clientHeight, clientWidth * 0.5)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // 清理过期的追踪点
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTrailPoints(prev =>
        prev.filter(point => now - point.timestamp < 2000) // 只保留2秒内的点
      );
    }, 100);

    return () => clearInterval(cleanupInterval);
  }, []);

  const renderEventZones = () => {
    return eventZones.map((zone) => {
      const confidence = eventConfidences?.find(c => c.type === zone.type)?.confidence || 0;
      const dynamicRadius = zone.radius * (0.5 + confidence * 0.5);
      const opacity = 0.2 + confidence * 0.8;

      return (
        <Group key={zone.type}>
          <Circle
            x={zone.x}
            y={zone.y}
            radius={dynamicRadius}
            fill={zone.color}
            opacity={opacity}
            shadowBlur={confidence * 20}
            shadowColor={zone.color}
            shadowOpacity={confidence}
          />
        </Group>
      );
    });
  };

  const renderTrail = () => {
    if (trailPoints.length < 2) return null;

    const now = Date.now();
    return trailPoints.map((point, i) => {
      if (i === 0) return null;
      const prevPoint = trailPoints[i - 1];

      // 计算点的年龄（0到1，1表示刚创建，0表示即将消失）
      const age = Math.max(0, Math.min(1, (2000 - (now - point.timestamp)) / 2000));

      // 使用三次方函数使衰减更自然
      const opacity = Math.pow(age, 3) * 0.6;

      return (
        <Line
          key={point.timestamp}
          points={[prevPoint.x, prevPoint.y, point.x, point.y]}
          stroke={point.color}
          strokeWidth={3}
          opacity={opacity}
          tension={0.3}
          lineCap="round"
          lineJoin="round"
        />
      );
    });
  };

  const renderCurrentPoint = () => {
    if (trailPoints.length === 0) return null;

    const lastPoint = trailPoints[trailPoints.length - 1];
    return (
      <Circle
        x={lastPoint.x}
        y={lastPoint.y}
        radius={8}
        fill={lastPoint.color}
        stroke="#000"
        strokeWidth={2}
        shadowBlur={15}
        shadowColor={lastPoint.color}
        opacity={1}
      />
    );
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }}>
      <Stage width={dimensions.width} height={dimensions.height}>
        <Layer>
          {renderEventZones()}
          {renderTrail()}
          {renderCurrentPoint()}
        </Layer>
      </Stage>
    </div>
  );
}; 