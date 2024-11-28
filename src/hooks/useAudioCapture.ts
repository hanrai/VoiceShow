import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioCaptureState {
	audioData: {
		frequency: Uint8Array;
		timeDomain: Uint8Array;
	} | null;
	analyser: AnalyserNode | null;
	audioContext: AudioContext | null;
	isCapturing: boolean;
}

// 数据验证工具函数
const getArrayStats = (arr: Uint8Array) => {
	const max = Math.max(...arr);
	const min = Math.min(...arr);
	const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
	const nonZeroCount = arr.reduce(
		(count, val) => count + (val !== 0 ? 1 : 0),
		0
	);
	return { max, min, mean, nonZeroCount, total: arr.length };
};

const validateAudioData = (frequencyData: Uint8Array, timeData: Uint8Array) => {
	// 检查数组长度
	if (frequencyData.length === 0 || timeData.length === 0) {
		console.warn('Empty audio data arrays');
		return false;
	}

	// 获取统计信息
	const freqStats = getArrayStats(frequencyData);
	const timeStats = getArrayStats(timeData);

	// 记录当前数据状态
	console.log('Audio data stats:', {
		frequency: freqStats,
		timeDomain: timeStats,
		hasSignal: timeStats.nonZeroCount > 0,
	});

	return timeStats.nonZeroCount > 0; // 只要有非零值就认为有信号
};

export function useAudioCapture() {
	const [isCapturing, setIsCapturing] = useState(false);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const streamRef = useRef<MediaStream>();
	const sourceRef = useRef<MediaStreamAudioSourceNode>();
	const frequencyDataRef = useRef<Uint8Array | null>(null);
	const timeDataRef = useRef<Uint8Array | null>(null);
	const frameRef = useRef<number>();
	const lastUpdateRef = useRef<number>(0);
	const updateCountRef = useRef(0);

	// 清理音频资源
	const cleanupAudio = useCallback(() => {
		console.log('Cleaning up audio resources...');

		if (frameRef.current) {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = undefined;
		}

		if (sourceRef.current) {
			sourceRef.current.disconnect();
			sourceRef.current = undefined;
		}

		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => {
				track.stop();
				console.log('Audio track stopped:', track.label);
			});
			streamRef.current = undefined;
		}

		if (audioContextRef.current) {
			audioContextRef.current.close().catch(console.error);
			audioContextRef.current = null;
		}

		analyserRef.current = null;
		frequencyDataRef.current = null;
		timeDataRef.current = null;
		updateCountRef.current = 0;
		setIsCapturing(false);

		console.log('Audio resources cleaned up');
	}, []);

	// 更新音频数据
	const updateData = useCallback(() => {
		if (!isCapturing) {
			console.log('Update loop stopped: not capturing');
			return;
		}

		if (
			!analyserRef.current ||
			!frequencyDataRef.current ||
			!timeDataRef.current
		) {
			console.log('Update loop stopped: missing references', {
				analyser: !!analyserRef.current,
				frequencyData: !!frequencyDataRef.current,
				timeData: !!timeDataRef.current,
			});
			return;
		}

		try {
			const analyser = analyserRef.current;
			const frequencyData = frequencyDataRef.current;
			const timeData = timeDataRef.current;

			// 获取新数据
			analyser.getByteFrequencyData(frequencyData);
			analyser.getByteTimeDomainData(timeData);

			// 验证并记录数据
			const hasSignal = validateAudioData(frequencyData, timeData);

			// 记录更新统计
			const now = performance.now();
			const timeSinceLastUpdate = now - lastUpdateRef.current;
			updateCountRef.current++;

			if (updateCountRef.current % 60 === 0) {
				console.log('Audio metrics:', {
					updateCount: updateCountRef.current,
					fps: 1000 / timeSinceLastUpdate,
					hasSignal,
					analyserState: {
						fftSize: analyser.fftSize,
						frequencyBinCount: analyser.frequencyBinCount,
						minDecibels: analyser.minDecibels,
						maxDecibels: analyser.maxDecibels,
					},
				});
			}

			lastUpdateRef.current = now;

			// 只有在仍然捕获时才继续更新循环
			if (isCapturing) {
				frameRef.current = requestAnimationFrame(updateData);
			}
		} catch (error) {
			console.error('Error in update loop:', error);
			cleanupAudio();
		}
	}, [isCapturing, cleanupAudio]);

	// 监听 isCapturing 状态变化
	useEffect(() => {
		if (isCapturing) {
			console.log('Starting update loop due to isCapturing change');
			frameRef.current = requestAnimationFrame(updateData);
		} else {
			if (frameRef.current) {
				console.log('Stopping update loop due to isCapturing change');
				cancelAnimationFrame(frameRef.current);
				frameRef.current = undefined;
			}
		}
	}, [isCapturing, updateData]);

	// 创建音频处理管道
	const setupAudioPipeline = useCallback(async () => {
		try {
			console.log('Setting up audio pipeline...');

			// 1. 请求麦克风权限
			console.log('Requesting microphone access...');
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					channelCount: 1,
					sampleRate: 44100,
				},
			});

			const track = stream.getAudioTracks()[0];
			console.log('Audio track info:', {
				label: track.label,
				enabled: track.enabled,
				muted: track.muted,
				readyState: track.readyState,
				constraints: track.getConstraints(),
			});

			// 2. 创建音频上下文
			const AudioContextClass =
				window.AudioContext || (window as any).webkitAudioContext;
			const audioContext = new AudioContextClass();

			// 确保音频上下文已启动
			if (audioContext.state !== 'running') {
				await audioContext.resume();
			}

			audioContextRef.current = audioContext;
			console.log('Audio context created:', {
				sampleRate: audioContext.sampleRate,
				state: audioContext.state,
				baseLatency: audioContext.baseLatency,
				outputLatency: audioContext.outputLatency,
			});

			// 3. 创建和连接音频节点
			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();

			// 调整分析器参数
			analyser.fftSize = 2048;
			analyser.minDecibels = -90;
			analyser.maxDecibels = -10;
			analyser.smoothingTimeConstant = 0.85;

			source.connect(analyser);
			console.log('Audio nodes connected:', {
				fftSize: analyser.fftSize,
				frequencyBinCount: analyser.frequencyBinCount,
				minDecibels: analyser.minDecibels,
				maxDecibels: analyser.maxDecibels,
			});

			// 4. 初始化数据缓冲区
			const frequencyData = new Uint8Array(analyser.frequencyBinCount);
			const timeData = new Uint8Array(analyser.fftSize);

			// 5. 初始化数据
			analyser.getByteFrequencyData(frequencyData);
			analyser.getByteTimeDomainData(timeData);

			const initialStats = {
				frequency: getArrayStats(frequencyData),
				timeDomain: getArrayStats(timeData),
			};

			console.log('Initial audio data:', initialStats);

			// 6. 保存引用
			streamRef.current = stream;
			sourceRef.current = source;
			analyserRef.current = analyser;
			frequencyDataRef.current = frequencyData;
			timeDataRef.current = timeData;

			console.log('Audio pipeline setup complete');
			return true;
		} catch (error) {
			console.error('Error in audio pipeline setup:', error);
			cleanupAudio();
			return false;
		}
	}, [cleanupAudio]);

	// 开始捕获
	const startCapture = useCallback(async () => {
		try {
			if (isCapturing) {
				cleanupAudio();
			}

			console.log('Starting audio capture...');
			const success = await setupAudioPipeline();

			if (!success) {
				throw new Error('Failed to setup audio pipeline');
			}

			// 先设置状态
			setIsCapturing(true);
			lastUpdateRef.current = performance.now();
			updateCountRef.current = 0;

			console.log('Audio capture started');
		} catch (error) {
			console.error('Error starting audio capture:', error);
			cleanupAudio();
		}
	}, [setupAudioPipeline, cleanupAudio, isCapturing]);

	// 组件卸载时清理
	useEffect(() => {
		return () => {
			cleanupAudio();
		};
	}, [cleanupAudio]);

	return {
		audioData:
			frequencyDataRef.current && timeDataRef.current && isCapturing
				? {
						frequency: frequencyDataRef.current,
						timeDomain: timeDataRef.current,
				  }
				: null,
		analyser: analyserRef.current,
		audioContext: audioContextRef.current,
		isCapturing,
		startCapture,
		stopCapture: cleanupAudio,
	};
}
