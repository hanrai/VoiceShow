export function calculateMFCC(
	audioData: Float32Array,
	sampleRate: number
): number[] {
	// 简单实现，返回13个MFCC系数
	const mfccCoefficients = new Array(13).fill(0);

	// TODO: 实现完整的MFCC计算
	// 1. 应用窗函数
	// 2. 计算FFT
	// 3. 计算Mel滤波器组
	// 4. 取对数
	// 5. 应用DCT

	return mfccCoefficients;
}
