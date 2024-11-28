import Meyda from 'meyda';

interface MeydaFeatures {
	mfcc: number[];
}

export function calculateMFCC(
	audioData: Float32Array,
	sampleRate: number
): number[] {
	try {
		// 配置 Meyda
		Meyda.bufferSize = 512;

		// 计算 MFCC
		const features = Meyda.extract(['mfcc'], audioData) as MeydaFeatures;

		// 检查是否成功获取到 MFCC
		if (!features || !features.mfcc) {
			console.warn('Failed to extract MFCC features');
			return new Array(13).fill(0);
		}

		// 返回 13 个 MFCC 系数
		return features.mfcc.slice(0, 13);
	} catch (error) {
		console.error('Error calculating MFCC:', error);
		return new Array(13).fill(0);
	}
}
