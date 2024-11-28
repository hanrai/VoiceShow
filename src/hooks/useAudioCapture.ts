import { useState, useEffect, useCallback, useRef } from 'react';
import Meyda from 'meyda';

interface AudioFeatures {
	rms: number;
	spectralCentroid: number;
	zcr: number;
	mfcc: number[];
	loudness: { total: number };
}

interface AudioState {
	audioData: Float32Array | null;
	spectrumData: Float32Array | null;
	mfccData: number[] | null;
	pitchData: number;
	loudnessData: number;
	vadStatus: boolean;
	features: AudioFeatures | null;
	isCapturing: boolean;
	error: string | null;
}

export const useAudioCapture = () => {
	const [audioState, setAudioState] = useState<AudioState>({
		audioData: null,
		spectrumData: null,
		mfccData: null,
		pitchData: 0,
		loudnessData: 0,
		vadStatus: false,
		features: null,
		isCapturing: false,
		error: null,
	});

	const audioContextRef = useRef<AudioContext>();
	const analyserRef = useRef<AnalyserNode>();
	const sourceRef = useRef<MediaStreamAudioSourceNode>();
	const gainNodeRef = useRef<GainNode>();
	const streamRef = useRef<MediaStream>();
	const animationFrameRef = useRef<number>();
	const dataArrayRef = useRef<Float32Array>();
	const frequencyArrayRef = useRef<Float32Array>();
	const isMountedRef = useRef(true);

	// 检查是否是安全上下文
	const checkSecureContext = () => {
		if (!window.isSecureContext) {
			throw new Error(
				'需要HTTPS连接才能访问麦克风。请使用HTTPS或localhost访问。'
			);
		}
		if (!navigator?.mediaDevices) {
			throw new Error(
				'您的浏览器不支持音频设备访问，请确保使用现代浏览器并授予麦克风权限。'
			);
		}
	};

	// 检查音频设备
	const checkAudioDevices = async () => {
		try {
			// 首先检查mediaDevices API是否可用
			if (!navigator?.mediaDevices?.getUserMedia) {
				throw new Error('您的浏览器不支持音频设备访问');
			}

			// 尝试直接获取音频权限
			await navigator.mediaDevices
				.getUserMedia({ audio: true })
				.then(stream => {
					// 成功获取后立即停止流
					stream.getTracks().forEach(track => track.stop());
				})
				.catch(err => {
					if (err.name === 'NotAllowedError') {
						throw new Error('请允许访问麦克风以使用此功能');
					} else if (err.name === 'NotFoundError') {
						throw new Error('未检测到麦克风设备');
					} else {
						throw new Error(`麦克风访问错误: ${err.message}`);
					}
				});

			// 如果成功获取了权限，再枚举设备
			const devices = await navigator.mediaDevices.enumerateDevices();
			const audioInputs = devices.filter(
				device => device.kind === 'audioinput'
			);
			console.log('Available audio inputs:', audioInputs);

			if (audioInputs.length === 0) {
				throw new Error('未检测到麦克风设备');
			}

			return true;
		} catch (error) {
			console.error('Error checking audio devices:', error);
			throw error;
		}
	};

	const updateData = useCallback(() => {
		if (
			!analyserRef.current ||
			!dataArrayRef.current ||
			!frequencyArrayRef.current
		) {
			return;
		}

		try {
			// 获取时域数据
			analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
			analyserRef.current.getFloatFrequencyData(frequencyArrayRef.current);

			// 检查是否有有效的音频数据
			const rms = Math.sqrt(
				dataArrayRef.current.reduce((acc, val) => acc + val * val, 0) /
					dataArrayRef.current.length
			);

			// 始终计算 MFCC
			const features = Meyda.extract(
				['rms', 'spectralCentroid', 'zcr', 'mfcc', 'loudness'],
				dataArrayRef.current
			) as AudioFeatures;

			if (isMountedRef.current) {
				if (rms > 0.0001) {
					// 有声音信号时更新所有特征
					setAudioState(prev => ({
						...prev,
						audioData: new Float32Array(dataArrayRef.current!),
						spectrumData: new Float32Array(frequencyArrayRef.current!),
						mfccData: features.mfcc,
						pitchData: features.spectralCentroid,
						loudnessData: features.loudness.total,
						features: features,
						vadStatus: true,
					}));
				} else {
					// 无声音信号时只更新 MFCC
					setAudioState(prev => ({
						...prev,
						mfccData: features.mfcc,
						vadStatus: false,
					}));
				}
			}

			// 继续下一帧
			animationFrameRef.current = requestAnimationFrame(updateData);
		} catch (error) {
			console.error('Error in updateData:', error);
		}
	}, []);

	const startCapture = useCallback(async () => {
		try {
			// 重置错误状态
			setAudioState(prev => ({ ...prev, error: null }));

			// 检查安全上下文
			checkSecureContext();

			// 检查音频设备
			await checkAudioDevices();

			// 停止现有的音频上下文和流
			if (audioContextRef.current) {
				await audioContextRef.current.close();
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
			}

			// 请求麦克风权限
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: false,
					channelCount: 1,
					sampleRate: 44100,
				},
			});

			console.log('Microphone stream created:', {
				tracks: stream.getAudioTracks().map(track => ({
					label: track.label,
					enabled: track.enabled,
					muted: track.muted,
					readyState: track.readyState,
				})),
			});

			streamRef.current = stream;

			// 创建音频上下文
			audioContextRef.current = new AudioContext({
				sampleRate: 44100,
				latencyHint: 'interactive',
			});

			console.log('Audio context state:', audioContextRef.current.state);
			await audioContextRef.current.resume();

			// 创建增益节点
			gainNodeRef.current = audioContextRef.current.createGain();
			gainNodeRef.current.gain.value = 10.0; // 增加增益值

			// 创建分析器节点
			analyserRef.current = audioContextRef.current.createAnalyser();
			analyserRef.current.fftSize = 2048;
			analyserRef.current.smoothingTimeConstant = 0.8;
			analyserRef.current.minDecibels = -90;
			analyserRef.current.maxDecibels = -10;

			// 创建源节点并连接音频处理链
			sourceRef.current =
				audioContextRef.current.createMediaStreamSource(stream);
			sourceRef.current.connect(gainNodeRef.current);
			gainNodeRef.current.connect(analyserRef.current);

			// 初始化缓冲区
			const bufferLength = analyserRef.current.frequencyBinCount;
			dataArrayRef.current = new Float32Array(bufferLength);
			frequencyArrayRef.current = new Float32Array(bufferLength);

			// 初始化 Meyda
			Meyda.bufferSize = bufferLength;
			Meyda.sampleRate = audioContextRef.current.sampleRate;
			Meyda.windowingFunction = 'hanning';
			Meyda.numberOfMFCCCoefficients = 13;

			console.log('Audio capture started:', {
				sampleRate: audioContextRef.current.sampleRate,
				bufferSize: bufferLength,
				fftSize: analyserRef.current.fftSize,
				contextState: audioContextRef.current.state,
				gainValue: gainNodeRef.current.gain.value,
				analyserConfig: {
					minDecibels: analyserRef.current.minDecibels,
					maxDecibels: analyserRef.current.maxDecibels,
					smoothingTimeConstant: analyserRef.current.smoothingTimeConstant,
				},
			});

			setAudioState(prev => ({ ...prev, isCapturing: true, error: null }));
			updateData();
		} catch (error) {
			console.error('Error starting audio capture:', error);
			const errorMessage =
				error instanceof Error ? error.message : '启动音频捕获时发生未知错误';
			setAudioState(prev => ({
				...prev,
				isCapturing: false,
				error: errorMessage,
			}));
		}
	}, [updateData]);

	useEffect(() => {
		isMountedRef.current = true;
		startCapture();

		return () => {
			isMountedRef.current = false;
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
			}
		};
	}, [startCapture]);

	return {
		audioData: audioState.audioData,
		spectrumData: audioState.spectrumData,
		mfccData: audioState.mfccData,
		pitchData: audioState.pitchData,
		loudnessData: audioState.loudnessData,
		vadStatus: audioState.vadStatus,
		features: audioState.features,
		isCapturing: audioState.isCapturing,
		error: audioState.error,
		startCapture,
	};
};
