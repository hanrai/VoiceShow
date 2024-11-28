import { useMemo } from 'react';
import Meyda from 'meyda';

interface AudioData {
	frequency: Uint8Array;
	timeDomain: Uint8Array;
}

interface MeydaFeatures {
	mfcc: number[];
	energy: number;
	loudness: {
		total: number;
		specific: Float32Array;
	};
	spectralCentroid: number;
	spectralRolloff: number;
	zcr: number;
	rms: number;
}

export interface AudioFeatures {
	mfccData: number[];
	spectrumData: Uint8Array;
	totalEnergy: number;
	loudness: number;
	spectralCentroid: number;
	spectralRolloff: number;
	zeroCrossingRate: number;
	rms: number;
}

// 将 Uint8Array 转换为 Float32Array，范围从 [0, 255] 转换到 [-1, 1]
const convertToFloat32 = (uint8Array: Uint8Array): Float32Array => {
	const float32Array = new Float32Array(uint8Array.length);
	for (let i = 0; i < uint8Array.length; i++) {
		float32Array[i] = (uint8Array[i] - 128) / 128;
	}
	return float32Array;
};

export const useAudioFeatures = (
	audioData: AudioData | null,
	fftSize: number,
	sampleRate: number
): AudioFeatures => {
	return useMemo(() => {
		const defaultFeatures: AudioFeatures = {
			mfccData: new Array(13).fill(0),
			spectrumData: new Uint8Array(fftSize / 2),
			totalEnergy: 0,
			loudness: 0,
			spectralCentroid: 0,
			spectralRolloff: 0,
			zeroCrossingRate: 0,
			rms: 0,
		};

		if (!audioData) {
			return defaultFeatures;
		}

		try {
			// 检查音频数据有效性
			if (
				audioData.timeDomain.length === 0 ||
				audioData.frequency.length === 0
			) {
				console.warn('Empty audio data received');
				return defaultFeatures;
			}

			// 检查音频数据范围
			const timeDataMax = Math.max(...audioData.timeDomain);
			const timeDataMin = Math.min(...audioData.timeDomain);
			const freqDataMax = Math.max(...audioData.frequency);
			const freqDataMin = Math.min(...audioData.frequency);

			// 检查数据是否有效
			const isValidData =
				timeDataMax !== timeDataMin &&
				freqDataMax !== freqDataMin &&
				!isNaN(timeDataMax) &&
				!isNaN(freqDataMax);

			if (!isValidData) {
				console.debug('Audio data validation:', {
					time: { min: timeDataMin, max: timeDataMax },
					freq: { min: freqDataMin, max: freqDataMax },
				});
				return defaultFeatures;
			}

			// 将 Uint8Array 转换为 Float32Array 用于 Meyda 处理
			const float32Data = convertToFloat32(audioData.timeDomain);

			// 配置 Meyda
			Meyda.bufferSize = fftSize;

			// 使用 Meyda 提取特征
			const features = Meyda.extract(
				[
					'mfcc',
					'energy',
					'loudness',
					'spectralCentroid',
					'spectralRolloff',
					'zcr',
					'rms',
				],
				float32Data
			) as MeydaFeatures;

			if (!features || !features.mfcc || !features.loudness) {
				console.warn('Invalid features extracted');
				return defaultFeatures;
			}

			// 检查特征值的有效性
			const isValidFeatures =
				features.mfcc.every(v => !isNaN(v) && isFinite(v)) &&
				!isNaN(features.energy) &&
				!isNaN(features.loudness.total) &&
				!isNaN(features.spectralCentroid) &&
				!isNaN(features.spectralRolloff) &&
				!isNaN(features.zcr) &&
				!isNaN(features.rms);

			if (!isValidFeatures) {
				console.warn('Invalid feature values detected');
				return defaultFeatures;
			}

			// 计算能量值（使用 RMS 的平方）
			const energy = features.rms * features.rms * 255;

			// 归一化特征
			const normalizedFeatures = {
				mfccData: features.mfcc,
				spectrumData: audioData.frequency,
				totalEnergy: energy,
				loudness: features.loudness.total * 255,
				spectralCentroid: features.spectralCentroid / (sampleRate / 2),
				spectralRolloff: features.spectralRolloff / (sampleRate / 2),
				zeroCrossingRate: features.zcr / fftSize,
				rms: features.rms,
			};

			// 记录有效的特征数据
			console.debug('Valid features extracted:', {
				mfccRange: {
					min: Math.min(...features.mfcc),
					max: Math.max(...features.mfcc),
				},
				energy: energy,
				loudness: normalizedFeatures.loudness,
				spectralCentroid: normalizedFeatures.spectralCentroid,
				spectralRolloff: normalizedFeatures.spectralRolloff,
				zeroCrossingRate: normalizedFeatures.zeroCrossingRate,
				rms: features.rms,
			});

			return normalizedFeatures;
		} catch (error) {
			console.error('Error extracting audio features:', error);
			return defaultFeatures;
		}
	}, [audioData, fftSize, sampleRate]);
};
