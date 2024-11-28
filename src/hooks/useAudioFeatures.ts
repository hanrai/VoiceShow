import { useMemo } from 'react';
import Meyda from 'meyda';

interface MeydaFeatures {
	mfcc: number[];
	energy: number;
	loudness: {
		total: number;
		specific: number[];
	};
}

export interface AudioFeatures {
	mfccData: number[];
	spectrumData: Float32Array;
	totalEnergy: number;
	loudness: number;
	dominantFrequency: number;
}

export const useAudioFeatures = (
	audioData: Float32Array | null,
	fftSize: number,
	sampleRate: number
): AudioFeatures => {
	return useMemo(() => {
		const defaultFeatures: AudioFeatures = {
			mfccData: [],
			spectrumData: new Float32Array(),
			totalEnergy: -100,
			loudness: -100,
			dominantFrequency: 0,
		};

		if (!audioData) {
			return defaultFeatures;
		}

		try {
			// 使用 Web Audio API 进行频谱分析
			const audioContext = new AudioContext({ sampleRate });
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = fftSize;

			// 创建音频源并连接
			const audioBuffer = audioContext.createBuffer(
				1,
				audioData.length,
				sampleRate
			);
			audioBuffer.getChannelData(0).set(audioData);
			const source = audioContext.createBufferSource();
			source.buffer = audioBuffer;
			source.connect(analyser);

			// 获取频谱数据
			const spectrumData = new Float32Array(analyser.frequencyBinCount);
			analyser.getFloatFrequencyData(spectrumData);

			// 使用 Meyda 提取高级特征
			Meyda.bufferSize = fftSize;
			const features = Meyda.extract(
				['mfcc', 'loudness', 'energy'],
				audioData
			) as MeydaFeatures;

			if (!features) {
				console.warn('Failed to extract audio features');
				return defaultFeatures;
			}

			// 计算主导频率
			const maxIndex = spectrumData.indexOf(Math.max(...spectrumData));
			const dominantFrequency = (maxIndex * sampleRate) / fftSize;

			// 清理音频上下文
			audioContext.close();

			return {
				mfccData: features.mfcc || new Array(13).fill(0),
				spectrumData,
				totalEnergy: features.energy ?? -100,
				loudness: features.loudness?.total ?? -100,
				dominantFrequency,
			};
		} catch (error) {
			console.error('Error extracting audio features:', error);
			return defaultFeatures;
		}
	}, [audioData, fftSize, sampleRate]);
};
