import React from 'react';
import { useAudioFeatures } from '../hooks/useAudioFeatures';
import FeatureVisualizer from './visualizers/FeatureVisualizer';

interface AudioFeaturesProps {
  audioData: {
    frequency: Uint8Array;
    timeDomain: Uint8Array;
  } | null;
  fftSize: number;
  sampleRate: number;
}

const visualizerConfigs = [
  {
    id: 'mfcc',
    title: 'MFCC',
    gradientColors: { from: 'gray-900', to: 'gray-800' },
    visualizerProps: {
      renderType: 'heatmap' as const,
      minValue: -0.2,
      maxValue: 0.2,
      height: 48,
      backgroundColor: '#0A0F1A'
    }
  },
  {
    id: 'spectrum',
    title: '频谱',
    gradientColors: { from: 'blue-900', to: 'blue-800' },
    visualizerProps: {
      renderType: 'spectrumWithPitch' as const,
      minValue: 0,
      maxValue: 255,
      maxFreq: 2000,
      color: 'rgba(96, 165, 250, 0.8)',
      smoothingFactor: 0.15,
      threshold: 128,
      clearBeforeDraw: true,
      height: 48,
      backgroundColor: '#0A0F1A'
    }
  },
  {
    id: 'energy',
    title: '能量',
    gradientColors: { from: 'gray-900', to: 'gray-800' },
    visualizerProps: {
      renderType: 'line' as const,
      color: 'rgba(52, 211, 153, 0.8)',
      minValue: 0,
      maxValue: 255,
      smoothingFactor: 0.1,
      displayUnit: '',
      isEnergy: true,
      height: 48,
      backgroundColor: '#0A0F1A'
    }
  },
  {
    id: 'spectralFeatures',
    title: '频谱特征',
    gradientColors: { from: 'gray-900', to: 'gray-800' },
    visualizerProps: {
      renderType: 'multiLine' as const,
      lines: [
        { name: '质心', color: 'rgba(52, 211, 153, 0.8)' },
        { name: '滚降', color: 'rgba(96, 165, 250, 0.8)' },
        { name: '过零率', color: 'rgba(249, 115, 22, 0.8)' }
      ],
      minValue: 0,
      maxValue: 1,
      smoothingFactor: 0.1,
      height: 48,
      backgroundColor: '#0A0F1A'
    }
  }
];

export const AudioFeatures: React.FC<AudioFeaturesProps> = ({
  audioData,
  fftSize,
  sampleRate
}) => {
  const features = useAudioFeatures(audioData, fftSize, sampleRate);

  return (
    <div className="grid grid-cols-1 gap-1.5">
      {visualizerConfigs.map((config) => (
        <FeatureVisualizer
          key={config.id}
          {...config}
          data={
            config.id === 'mfcc'
              ? features.mfccData
              : config.id === 'spectrum'
                ? Array.from(audioData?.frequency || []).map(v => v / 255)
                : config.id === 'energy'
                  ? [features.totalEnergy]
                  : config.id === 'spectralFeatures'
                    ? [
                      features.spectralCentroid,
                      features.spectralRolloff,
                      features.zeroCrossingRate
                    ]
                    : []
          }
        />
      ))}
    </div>
  );
}; 