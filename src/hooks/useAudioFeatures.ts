import { useMemo } from 'react';
import { calculateMFCC } from '../utils/mfcc';
import { calculateLoudness } from '../utils/loudness';

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
		if (!audioData) {
			return {
				mfccData: [],
				spectrumData: new Float32Array(),
				totalEnergy: -100,
				loudness: -100,
				dominantFrequency: 0,
			};
		}

		// 计算频谱数据
		const spectrumData = new Float32Array(fftSize / 2);
		// TODO: 使用 Web Audio API 的 AnalyserNode 来获取频谱数据

		// 计算 MFCC
		const mfccData = calculateMFCC(audioData, sampleRate);

		// 计算总能量
		const totalEnergy = spectrumData.reduce(
			(sum, value) => sum + Math.pow(10, value / 10),
			0
		);
		const totalEnergyDb = 10 * Math.log10(totalEnergy);

		// 计算响度
		const loudness = calculateLoudness(spectrumData);

		// 计算主导频率
		const dominantFrequency = calculateDominantFrequency(
			spectrumData,
			sampleRate
		);

		return {
			mfccData,
			spectrumData,
			totalEnergy: totalEnergyDb,
			loudness,
			dominantFrequency,
		};
	}, [audioData, fftSize, sampleRate]);
};

function calculateDominantFrequency(
	spectrum: Float32Array,
	sampleRate: number
): number {
	let maxIndex = 0;
	let maxValue = -Infinity;

	for (let i = 0; i < spectrum.length; i++) {
		if (spectrum[i] > maxValue) {
			maxValue = spectrum[i];
			maxIndex = i;
		}
	}

	return (maxIndex * sampleRate) / (spectrum.length * 2);
}
