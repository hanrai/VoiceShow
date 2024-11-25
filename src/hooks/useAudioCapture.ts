import { useState, useEffect, useCallback, useRef } from 'react';
import Meyda from 'meyda';

interface MeydaFeatures {
	mfcc: number[];
	[key: string]: any;
}

interface MeydaAnalyzer {
	start: () => void;
	stop: () => void;
	get: (features: string[]) => MeydaFeatures;
}

declare const window: Window & {
	Meyda: {
		createMeydaAnalyzer: (config: {
			audioContext: AudioContext;
			source: MediaStreamAudioSourceNode;
			bufferSize: number;
			numberOfMFCCCoefficients: number;
			featureExtractors: string[];
			callback: (features: MeydaFeatures) => void;
		}) => MeydaAnalyzer;
	};
};

const detectPitch = (buffer: Float32Array, sampleRate: number): number => {
	const minFreq = 80; // 人声最低频率约 80Hz
	const maxFreq = 400; // 人声最高频率约 400Hz
	const minPeriod = Math.floor(sampleRate / maxFreq);
	const maxPeriod = Math.floor(sampleRate / minFreq);

	// 计算自相关
	const correlations = new Float32Array(maxPeriod);
	let maxAbs = 0;

	// 使用中心削波自相关，但降低削波阈值
	for (let lag = minPeriod; lag < maxPeriod; lag++) {
		let sum = 0;
		let count = 0;
		for (let i = 0; i < buffer.length - lag; i++) {
			sum += buffer[i] * buffer[i + lag];
			count++;
		}
		correlations[lag] = count > 0 ? sum / count : 0;
		maxAbs = Math.max(maxAbs, Math.abs(correlations[lag]));
	}

	// 归一化
	if (maxAbs > 0) {
		for (let i = 0; i < maxPeriod; i++) {
			correlations[i] /= maxAbs;
		}
	}

	// 寻找峰值
	let maxCorrelation = -1;
	let period = 0;
	const CORRELATION_THRESHOLD = 0.1; // 降低相关性要求
	const PEAK_THRESHOLD = 1.05; // 降低峰值要求

	for (let lag = minPeriod; lag < maxPeriod; lag++) {
		if (
			correlations[lag] > CORRELATION_THRESHOLD &&
			correlations[lag] > maxCorrelation &&
			correlations[lag] > correlations[lag - 1] * PEAK_THRESHOLD &&
			correlations[lag] > correlations[lag + 1] * PEAK_THRESHOLD
		) {
			// 检查是否是谐波
			let isHarmonic = false;
			for (
				let sublag = Math.max(minPeriod, Math.floor(lag / 2));
				sublag < lag - 1;
				sublag++
			) {
				if (correlations[sublag] > correlations[lag] * 0.9) {
					isHarmonic = true;
					break;
				}
			}

			if (!isHarmonic) {
				maxCorrelation = correlations[lag];
				period = lag;
			}
		}
	}

	return period > 0 ? sampleRate / period : 0;
};

// 添加响度计算函数
const calculateLoudness = (buffer: Float32Array): number => {
	// 计算RMS
	let sum = 0;
	for (let i = 0; i < buffer.length; i++) {
		sum += buffer[i] * buffer[i];
	}
	const rms = Math.sqrt(sum / buffer.length);

	// 转换为分贝，使用较小的参考值以获得更好的显示范围
	const REF_VALUE = 0.00001;
	const db = 20 * Math.log10(Math.max(rms, REF_VALUE));

	// 限制范围在 -60 到 0 dB
	return Math.max(-60, Math.min(0, db));
};

export const useAudioCapture = () => {
	const [isCapturing, setIsCapturing] = useState(false);
	const [audioData, setAudioData] = useState<Float32Array | null>(null);
	const [spectrumData, setSpectrumData] = useState<Float32Array | null>(null);
	const [mfccData, setMfccData] = useState<number[] | null>(null);
	const [pitchData, setPitchData] = useState<number[]>([]);
	const [loudnessData, setLoudnessData] = useState<number[]>([]); // 添加响度状态

	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const meydaAnalyzerRef = useRef<MeydaAnalyzer | null>(null);
	const animationFrameRef = useRef<number>();
	const dataArrayRef = useRef<Float32Array>();
	const frequencyArrayRef = useRef<Float32Array>();
	const isMountedRef = useRef(true);

	const updateData = useCallback(() => {
		if (
			!analyserRef.current ||
			!dataArrayRef.current ||
			!frequencyArrayRef.current ||
			!isMountedRef.current
		)
			return;

		analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
		const newData = new Float32Array(dataArrayRef.current);

		analyserRef.current.getFloatFrequencyData(frequencyArrayRef.current);
		const usefulBins = Math.floor(frequencyArrayRef.current.length / 2);
		const newSpectrumData = new Float32Array(
			frequencyArrayRef.current.subarray(0, usefulBins)
		);

		if (isMountedRef.current && audioContextRef.current) {
			// 计算音高
			const pitch = detectPitch(newData, audioContextRef.current.sampleRate);
			setPitchData([pitch]);

			// 计算响度
			const loudness = calculateLoudness(newData);
			setLoudnessData([loudness]);

			setAudioData(newData);
			setSpectrumData(newSpectrumData);

			if (meydaAnalyzerRef.current) {
				const features = meydaAnalyzerRef.current.get(['mfcc']);
				if (features?.mfcc) {
					setMfccData(features.mfcc);
				}
			}

			animationFrameRef.current = requestAnimationFrame(updateData);
		}
	}, []);

	const startCapture = useCallback(async () => {
		if (audioContextRef.current) return;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			audioContextRef.current = new AudioContext();
			analyserRef.current = audioContextRef.current.createAnalyser();

			analyserRef.current.fftSize = 2048;
			analyserRef.current.smoothingTimeConstant = 0.85;
			analyserRef.current.minDecibels = -90;
			analyserRef.current.maxDecibels = -10;

			const source = audioContextRef.current.createMediaStreamSource(stream);
			source.connect(analyserRef.current);

			meydaAnalyzerRef.current = window.Meyda.createMeydaAnalyzer({
				audioContext: audioContextRef.current,
				source: source,
				bufferSize: 2048,
				numberOfMFCCCoefficients: 13,
				featureExtractors: ['mfcc'],
				callback: (features: MeydaFeatures) => {
					if (features.mfcc && isMountedRef.current) {
						setMfccData(features.mfcc);
					}
				},
			});

			meydaAnalyzerRef.current.start();

			const bufferLength = analyserRef.current.frequencyBinCount;
			dataArrayRef.current = new Float32Array(bufferLength);
			frequencyArrayRef.current = new Float32Array(bufferLength);

			setIsCapturing(true);
			updateData();
		} catch (error) {
			console.error('Error accessing microphone:', error);
		}
	}, [updateData]);

	useEffect(() => {
		isMountedRef.current = true;

		return () => {
			isMountedRef.current = false;
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			if (meydaAnalyzerRef.current) {
				meydaAnalyzerRef.current.stop();
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, []);

	return {
		audioData,
		spectrumData,
		mfccData,
		pitchData,
		loudnessData, // 添加响度数据到返回值
		startCapture,
		isCapturing,
	};
};
