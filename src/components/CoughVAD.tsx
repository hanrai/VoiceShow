import React, { useEffect, useCallback } from 'react';
import Meyda from 'meyda';

export interface AudioEvent {
  type: 'cough' | 'speech' | 'noise' | 'laugh' | 'sneeze' | 'breath';
  confidence: number;
  timestamp: number;
  features: {
    rms: number;
    spectralCentroid: number;
    zcr: number;
    mfcc: number[];
    loudness: { total: number };
  };
}

interface CoughVADProps {
  audioData: Float32Array;
  onVADResult: (event: AudioEvent) => void;
  onFeatures?: (features: number[]) => void;
}

// 事件类型的特征范围定义
const EVENT_RANGES = {
  cough: {
    rms: { min: 0.01, max: 1.0 },        // 降低最小 RMS 阈值
    spectralCentroid: { min: 500, max: 4000 },  // 扩大频谱范围
    zcr: { min: 100, max: 3000 },        // 扩大过零率范围
    loudness: { min: -60, max: -10 }     // 扩大响度范围
  },
  speech: {
    rms: { min: 0.005, max: 0.8 },       // 降低最小 RMS 阈值
    spectralCentroid: { min: 200, max: 3000 },
    zcr: { min: 50, max: 2000 },
    loudness: { min: -70, max: -20 }
  },
  laugh: {
    rms: { min: 0.008, max: 0.9 },
    spectralCentroid: { min: 300, max: 3500 },
    zcr: { min: 80, max: 2500 },
    loudness: { min: -65, max: -15 }
  },
  sneeze: {
    rms: { min: 0.015, max: 1.0 },
    spectralCentroid: { min: 600, max: 4500 },
    zcr: { min: 120, max: 3500 },
    loudness: { min: -55, max: -5 }
  },
  breath: {
    rms: { min: 0.003, max: 0.5 },
    spectralCentroid: { min: 100, max: 2000 },
    zcr: { min: 30, max: 1500 },
    loudness: { min: -80, max: -30 }
  },
  noise: {
    rms: { min: 0.001, max: 0.3 },
    spectralCentroid: { min: 0, max: 5000 },
    zcr: { min: 0, max: 4000 },
    loudness: { min: -90, max: -40 }
  }
};

export const CoughVAD: React.FC<CoughVADProps> = ({
  audioData,
  onVADResult,
  onFeatures
}) => {
  // 计算特征值与事件类型的匹配度
  const calculateEventConfidence = useCallback((features: AudioEvent['features'], eventType: AudioEvent['type']) => {
    const ranges = EVENT_RANGES[eventType];

    // RMS 评分（使用对数刻度）
    const rmsScore = (features.rms >= ranges.rms.min && features.rms <= ranges.rms.max) ?
      1 - Math.abs(Math.log10(features.rms / ((ranges.rms.max + ranges.rms.min) / 2))) : 0;

    // 频谱质心评分（使用对数刻度）
    const centroidScore = (features.spectralCentroid >= ranges.spectralCentroid.min &&
      features.spectralCentroid <= ranges.spectralCentroid.max) ?
      1 - Math.abs(Math.log10(features.spectralCentroid /
        ((ranges.spectralCentroid.max + ranges.spectralCentroid.min) / 2))) : 0;

    // 过零率评分
    const zcrScore = (features.zcr >= ranges.zcr.min && features.zcr <= ranges.zcr.max) ?
      1 - Math.abs((features.zcr - (ranges.zcr.max + ranges.zcr.min) / 2) /
        (ranges.zcr.max - ranges.zcr.min)) : 0;

    // 响度评分（使用对数刻度）
    const normalizedLoudness = features.loudness.total - ranges.loudness.min;
    const loudnessRange = ranges.loudness.max - ranges.loudness.min;
    const loudnessScore = (normalizedLoudness >= 0 && normalizedLoudness <= loudnessRange) ?
      1 - Math.abs(normalizedLoudness - loudnessRange / 2) / (loudnessRange / 2) : 0;

    // MFCC方差评分（使用对数刻度）
    const mfccVariance = features.mfcc.reduce((acc, val) => acc + val * val, 0) / features.mfcc.length;
    const mfccScore = Math.min(1, Math.max(0, (Math.log10(mfccVariance + 1) + 1) / 2));

    // 综合评分，使用动态权重
    let score = 0;
    if (eventType === 'cough') {
      score = (
        rmsScore * 0.35 +      // 增加 RMS 权重
        centroidScore * 0.25 + // 增加频谱质心权重
        zcrScore * 0.15 +      // 降低过零率权重
        loudnessScore * 0.15 + // 降低响度权重
        mfccScore * 0.1        // 保持 MFCC 权重
      );
    } else if (eventType === 'speech') {
      score = (
        rmsScore * 0.2 +
        centroidScore * 0.3 +
        zcrScore * 0.2 +
        loudnessScore * 0.2 +
        mfccScore * 0.1
      );
    } else if (eventType === 'laugh') {
      score = (
        rmsScore * 0.1 +
        centroidScore * 0.2 +
        zcrScore * 0.2 +
        loudnessScore * 0.2 +
        mfccScore * 0.1
      );
    } else if (eventType === 'sneeze') {
      score = (
        rmsScore * 0.2 +
        centroidScore * 0.2 +
        zcrScore * 0.2 +
        loudnessScore * 0.2 +
        mfccScore * 0.1
      );
    } else if (eventType === 'breath') {
      score = (
        rmsScore * 0.1 +
        centroidScore * 0.2 +
        zcrScore * 0.2 +
        loudnessScore * 0.2 +
        mfccScore * 0.1
      );
    } else { // noise
      score = (
        rmsScore * 0.15 +
        centroidScore * 0.15 +
        zcrScore * 0.3 +
        loudnessScore * 0.3 +
        mfccScore * 0.1
      );
    }

    return Math.max(0, Math.min(1, score));
  }, []);

  useEffect(() => {
    if (!audioData || audioData.length === 0) return;

    try {
      // 检查是否有有效的音频数据
      const hasValidData = audioData.some(value => Math.abs(value) > 0.001);

      if (!hasValidData) {
        return;
      }

      // 使用 Meyda 提取特征
      const features = Meyda.extract([
        'rms',
        'spectralCentroid',
        'zcr',
        'mfcc',
        'loudness'
      ], audioData) as AudioEvent['features'];

      // 计算每种事件类型的置信度
      const confidences = Object.keys(EVENT_RANGES).map(type => ({
        type: type as AudioEvent['type'],
        confidence: calculateEventConfidence(features, type as AudioEvent['type'])
      }));

      // 找出置信度最高的事件类型
      const bestMatch = confidences.reduce((prev, current) =>
        current.confidence > prev.confidence ? current : prev
      );

      // 降低事件触发阈值
      if (bestMatch.confidence > 0.2) {
        const event: AudioEvent = {
          type: bestMatch.type,
          confidence: bestMatch.confidence,
          timestamp: Date.now(),
          features
        };

        console.log('Event detected:', {
          type: event.type,
          confidence: event.confidence.toFixed(2),
          rms: features.rms.toFixed(6),
          centroid: features.spectralCentroid.toFixed(2),
          zcr: features.zcr.toFixed(2),
          loudness: features.loudness.total.toFixed(2)
        });

        onVADResult(event);
      }

      // 发送特征数据用于可视化
      if (onFeatures) {
        onFeatures([
          features.rms,
          features.spectralCentroid / 5000, // 归一化频谱质心
          features.zcr / 4000,              // 归一化过零率
          (features.loudness.total + 100) / 100, // 归一化响度
          ...features.mfcc.map(v => (v + 20) / 40) // 归一化 MFCC
        ]);
      }
    } catch (error) {
      console.error('Error processing audio features:', error);
    }
  }, [audioData, onVADResult, onFeatures, calculateEventConfidence]);

  return null;
}; 