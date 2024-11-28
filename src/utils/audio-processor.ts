import Meyda from 'meyda';

class AudioFeatureProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		// 配置 Meyda
		Meyda.bufferSize = 512;
	}

	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>
	) {
		const input = inputs[0][0];
		if (!input) return true;

		try {
			// 计算 MFCC
			const features = Meyda.extract(['mfcc'], input) as { mfcc: number[] };

			// 发送特征到主线程
			this.port.postMessage({
				type: 'features',
				data: features.mfcc.slice(0, 13),
			});
		} catch (error) {
			console.error('Error in audio processing:', error);
		}

		return true;
	}
}

registerProcessor('audio-feature-processor', AudioFeatureProcessor);
