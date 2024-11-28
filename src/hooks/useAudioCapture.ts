import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioFeatures, AudioState } from '../types/audio';

// 将 AudioProcessor 代码内联到这里
const audioProcessorWorklet = `
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameCount = 0;
    this.PROCESS_INTERVAL = 8;
    this.FFT_SIZE = 2048;
    this.timeData = new Float32Array(2048);
    this.freqData = new Float32Array(1024);
    this.lastProcessTime = currentTime;
    this.PROCESS_TIME_INTERVAL = 0.1;
  }

  calculateMFCC(freqData) {
    // 简化的MFCC计算
    const numCoefficients = 13;
    const mfcc = new Float32Array(numCoefficients);
    const melFilters = 26;
    const sampleRate = 44100;
    
    // 计算Mel频率
    const melMax = 2595 * Math.log10(1 + sampleRate / 2 / 700);
    const melMin = 0;
    const melStep = (melMax - melMin) / (melFilters + 1);
    
    // 简化的MFCC计算过程
    for (let i = 0; i < numCoefficients; i++) {
      let sum = 0;
      for (let j = 0; j < melFilters; j++) {
        const melFreq = melMin + j * melStep;
        const freq = 700 * (Math.pow(10, melFreq / 2595) - 1);
        const bin = Math.floor(freq * this.FFT_SIZE / sampleRate);
        if (bin < freqData.length) {
          sum += freqData[bin] * Math.cos((Math.PI * i * (j + 0.5)) / melFilters);
        }
      }
      mfcc[i] = sum;
    }
    return mfcc;
  }

  calculatePitch(timeData) {
    // 使用自相关法计算基频
    const correlations = new Float32Array(timeData.length);
    for (let lag = 0; lag < correlations.length; lag++) {
      let sum = 0;
      for (let i = 0; i < correlations.length - lag; i++) {
        sum += timeData[i] * timeData[i + lag];
      }
      correlations[lag] = sum;
    }
    
    // 寻找第一个峰值
    let maxCorrelation = 0;
    let maxLag = 0;
    for (let lag = 50; lag < correlations.length / 2; lag++) {
      if (correlations[lag] > maxCorrelation) {
        maxCorrelation = correlations[lag];
        maxLag = lag;
      }
    }
    
    return maxLag > 0 ? 44100 / maxLag : 0;
  }

  process(inputs, outputs, parameters) {
    if (currentTime - this.lastProcessTime < this.PROCESS_TIME_INTERVAL) {
      return true;
    }

    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    if (this.frameCount++ % this.PROCESS_INTERVAL !== 0) {
      return true;
    }

    const audioData = input[0];
    const timeDataCopy = audioData.slice();
    const freqDataCopy = new Float32Array(this.freqData.length);
    
    // 频谱计算
    let maxEnergy = 0;
    const skipFactor = 4;
    for (let i = 0; i < this.FFT_SIZE / 2; i += skipFactor) {
      const energy = audioData[i] * audioData[i];
      maxEnergy = Math.max(maxEnergy, energy);
      freqDataCopy[i] = energy;
    }
    
    // 归一化
    if (maxEnergy > 0) {
      for (let i = 0; i < freqDataCopy.length; i++) {
        if (i % skipFactor === 0) {
          freqDataCopy[i] /= maxEnergy;
        } else {
          const prev = freqDataCopy[i - (i % skipFactor)];
          const next = freqDataCopy[i - (i % skipFactor) + skipFactor] || prev;
          freqDataCopy[i] = prev + (next - prev) * ((i % skipFactor) / skipFactor);
        }
      }
    }

    // 计算MFCC
    const mfccData = this.calculateMFCC(freqDataCopy);
    
    // 计算音高
    const pitch = this.calculatePitch(timeDataCopy);

    // 计算响度
    let loudness = 0;
    for (let i = 0; i < timeDataCopy.length; i++) {
      loudness += timeDataCopy[i] * timeDataCopy[i];
    }
    loudness = Math.sqrt(loudness / timeDataCopy.length);

    this.lastProcessTime = currentTime;
    this.port.postMessage({
      timeData: timeDataCopy,
      freqData: freqDataCopy,
      mfccData,
      pitch,
      loudness,
      timestamp: currentTime
    }, [timeDataCopy.buffer, freqDataCopy.buffer]);

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);`;

export const useAudioCapture = () => {
	const [audioState, setAudioState] = useState<AudioState>({
		audioData: null,
		spectrumData: null,
		mfccData: [],
		pitchData: 0,
		loudnessData: 0,
		features: null,
		vadStatus: false,
		isCapturing: false,
	});

	const [error, setError] = useState<string | null>(null);
	const audioContextRef = useRef<AudioContext>();
	const audioWorkletRef = useRef<AudioWorkletNode>();
	const streamRef = useRef<MediaStream>();
	const sourceNodeRef = useRef<MediaStreamAudioSourceNode>();
	const isMountedRef = useRef(true);
	const animationFrameRef = useRef<number>();
	const initializingRef = useRef(false);
	const processingRef = useRef(false);

	// 清理函数
	const cleanup = useCallback(async () => {
		processingRef.current = false;

		if (audioContextRef.current) {
			try {
				if (audioContextRef.current.state !== 'closed') {
					await audioContextRef.current.close();
				}
			} catch (err) {
				console.error('关闭 AudioContext 时出错:', err);
			}
			audioContextRef.current = undefined;
		}

		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => {
				try {
					track.stop();
				} catch (err) {
					console.error('停止音频轨道时出错:', err);
				}
			});
			streamRef.current = undefined;
		}

		if (audioWorkletRef.current) {
			try {
				audioWorkletRef.current.disconnect();
			} catch (err) {
				console.error('断开 AudioWorklet 时出错:', err);
			}
			audioWorkletRef.current = undefined;
		}

		if (sourceNodeRef.current) {
			try {
				sourceNodeRef.current.disconnect();
			} catch (err) {
				console.error('断开音频源时出错:', err);
			}
			sourceNodeRef.current = undefined;
		}

		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = undefined;
		}

		setAudioState(prev => ({ ...prev, isCapturing: false }));
	}, []);

	// 初始化音频处理
	const initAudio = useCallback(async () => {
		if (initializingRef.current || processingRef.current) {
			return;
		}

		try {
			initializingRef.current = true;
			await cleanup();

			console.log('请求麦克风权限...');
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					sampleRate: 44100,
				},
			});

			console.log('创建 AudioContext...');
			const ctx = new AudioContext({
				latencyHint: 'interactive',
				sampleRate: 44100,
			});

			if (ctx.state === 'suspended') {
				console.log('恢复 AudioContext...');
				await ctx.resume();
			}

			console.log('注册 AudioWorklet...');
			const workletBlob = new Blob([audioProcessorWorklet], {
				type: 'application/javascript',
			});
			const workletUrl = URL.createObjectURL(workletBlob);

			try {
				await ctx.audioWorklet.addModule(workletUrl);
			} finally {
				URL.revokeObjectURL(workletUrl);
			}

			console.log('创建音频节点...');
			const sourceNode = ctx.createMediaStreamSource(stream);
			const workletNode = new AudioWorkletNode(ctx, 'audio-processor', {
				numberOfInputs: 1,
				numberOfOutputs: 1,
				channelCount: 1,
				processorOptions: {
					bufferSize: 2048,
				},
			});

			sourceNode.connect(workletNode);

			// 保存引用
			audioContextRef.current = ctx;
			streamRef.current = stream;
			sourceNodeRef.current = sourceNode;
			audioWorkletRef.current = workletNode;
			processingRef.current = true;

			// 设置消息处理器
			workletNode.port.onmessage = event => {
				if (!isMountedRef.current || !processingRef.current) return;

				const { timeData, freqData, mfccData, pitch, loudness } = event.data;

				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current);
				}

				animationFrameRef.current = requestAnimationFrame(() => {
					if (!isMountedRef.current || !processingRef.current) return;
					setAudioState(prev => ({
						...prev,
						audioData: timeData,
						spectrumData: freqData,
						mfccData: Array.from(mfccData),
						pitchData: pitch,
						loudnessData: loudness,
						isCapturing: true,
					}));
				});
			};

			setAudioState(prev => ({ ...prev, isCapturing: true }));
			setError(null);
			console.log('音频初始化完成');
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : '初始化音频失败';
			console.error('音频初始化错误:', errorMessage);
			setError(errorMessage);
			setAudioState(prev => ({ ...prev, isCapturing: false }));
			await cleanup();
		} finally {
			initializingRef.current = false;
		}
	}, [cleanup]);

	// 组件挂载时自动启动
	useEffect(() => {
		isMountedRef.current = true;

		const initializeAudio = async () => {
			try {
				await initAudio();
			} catch (err) {
				console.error('自动初始化音频失败:', err);
			}
		};

		initializeAudio();

		return () => {
			isMountedRef.current = false;
			cleanup();
		};
	}, [initAudio, cleanup]);

	return {
		...audioState,
		error,
		startAudio: initAudio,
	};
};
