import React, { useState } from 'react';
import { Layout, Card, Space, ConfigProvider, theme } from 'antd';
import { useAudioCapture } from './hooks/useAudioCapture';
import { AudioFeatures } from './components/AudioFeatures';
import { NeuralNetworkViz } from './components/NeuralNetworkViz';
import { CoughVAD } from './components/CoughVAD';
import { CoughVisualization } from './components/CoughVisualization';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AnimatedMicrophone } from './components/AnimatedMicrophone';
import { SpectrumVisualizer } from './components/SpectrumVisualizer';
import { AudioEvent } from './components/CoughVAD';

const { Content } = Layout;

// antd 主题配置
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#60A5FA',
    colorBgContainer: '#0A0F1A',
    colorBgElevated: '#0A0F1A',
    borderRadius: 8,
  },
};

function App() {
  const [features, setFeatures] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<AudioEvent | null>(null);
  const [eventConfidences, setEventConfidences] = useState<{ type: AudioEvent['type']; confidence: number; }[]>([
    { type: 'cough', confidence: 0 },
    { type: 'speech', confidence: 0 },
    { type: 'noise', confidence: 0 },
    { type: 'laugh', confidence: 0 },
    { type: 'sneeze', confidence: 0 },
    { type: 'breath', confidence: 0 }
  ]);

  const {
    audioData,
    analyser,
    audioContext,
    isCapturing,
    startCapture,
    stopCapture
  } = useAudioCapture();

  const updateEventConfidence = (event: AudioEvent) => {
    setEventConfidences(prev =>
      prev.map(ec =>
        ec.type === event.type
          ? { ...ec, confidence: event.confidence }
          : { ...ec, confidence: Math.max(0, ec.confidence - 0.1) }
      )
    );
  };

  return (
    <ConfigProvider theme={darkTheme}>
      <Layout className="min-h-screen" style={{ background: '#0A0F1A' }}>
        <Content className="p-2">
          <Space direction="vertical" size={12} className="w-full">
            {/* 麦克风状态和音频特征 */}
            <Card bordered={false} bodyStyle={{ padding: '8px', background: 'transparent' }}>
              <div className="flex flex-col gap-4">
                {/* 麦克风和频谱图 */}
                <div className="flex items-center gap-4 h-12">
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    onClick={isCapturing ? stopCapture : startCapture}
                    style={{ width: '48px', height: '48px' }}
                  >
                    <AnimatedMicrophone isActive={isCapturing} />
                  </div>
                  <div className="flex-grow h-full">
                    <SpectrumVisualizer data={audioData} height={48} />
                  </div>
                </div>

                {/* 音频特征 */}
                <div className="flex-grow">
                  <AudioFeatures
                    audioData={audioData}
                    fftSize={analyser?.fftSize || 2048}
                    sampleRate={audioContext?.sampleRate || 48000}
                  />
                </div>
              </div>
            </Card>

            {/* 神经网络可视化 */}
            <Card bordered={false} bodyStyle={{ padding: '8px', background: 'transparent' }}>
              <NeuralNetworkViz
                isProcessing={isProcessing}
                mfccData={features}
              />
            </Card>

            {/* 分类结果可视化 */}
            <Card bordered={false} bodyStyle={{ padding: '8px', background: 'transparent' }}>
              <ErrorBoundary>
                <CoughVisualization
                  features={features}
                  isProcessing={isProcessing}
                  currentEvent={currentEvent}
                  eventConfidences={eventConfidences}
                />
              </ErrorBoundary>
            </Card>

            {/* 音频事件检测 */}
            {audioData && (
              <CoughVAD
                audioData={audioData}
                onVADResult={(event) => {
                  console.log('Audio event detected:', event);
                  setCurrentEvent(event);
                  updateEventConfidence(event);
                  setIsProcessing(false);
                }}
                onFeatures={(features) => {
                  setFeatures(features);
                  setIsProcessing(true);
                }}
              />
            )}
          </Space>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;