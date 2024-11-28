import React from 'react';
import { useAudioFeatures } from '../hooks/useAudioFeatures';
import FeatureVisualizer from './visualizers/FeatureVisualizer';

interface AudioFeaturesProps {
  audioData: Float32Array | null;
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
    id: 'pitch',
    title: '音高',
    gradientColors: { from: 'blue-900', to: 'blue-800' },
    visualizerProps: {
      renderType: 'spectrumWithPitch' as const,
      minValue: -100,
      maxValue: 0,
      maxFreq: 2000,
      color: 'rgba(96, 165, 250, 0.8)',
      smoothingFactor: 0.15,
      threshold: -60,
      clearBeforeDraw: true,
      height: 48,
      backgroundColor: '#0A0F1A'
    }
  },
  {
    id: 'energy',
    title: '总能量',
    gradientColors: { from: 'gray-900', to: 'gray-800' },
    visualizerProps: {
      renderType: 'line' as const,
      color: 'rgba(52, 211, 153, 0.8)',
      minValue: -80,
      maxValue: -20,
      smoothingFactor: 0.1,
      displayUnit: 'dB',
      isEnergy: true,
      height: 48,
      backgroundColor: '#0A0F1A'
    }
  },
  {
    id: 'loudness',
    title: 'Loudness',
    gradientColors: { from: 'gray-900', to: 'gray-800' },
    visualizerProps: {
      renderType: 'line' as const,
      color: 'rgba(52, 211, 153, 0.8)',
      minValue: -60,
      maxValue: 0,
      smoothingFactor: 0.1,
      displayUnit: 'dB',
      isEnergy: true,
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
              : config.id === 'pitch'
                ? features.spectrumData
                : config.id === 'energy'
                  ? [features.totalEnergy]
                  : [features.loudness]
          }
          value={
            config.id === 'energy'
              ? `${features.totalEnergy.toFixed(1)} dB`
              : config.id === 'loudness'
                ? `${features.loudness.toFixed(1)} dB`
                : undefined
          }
        />
      ))}
    </div>
  );
}; 