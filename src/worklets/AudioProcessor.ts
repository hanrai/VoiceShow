/// <reference lib="webworker" />

declare var AudioWorkletProcessor: {
	prototype: AudioWorkletProcessor;
	new (): AudioWorkletProcessor;
};

declare var currentTime: number;
declare var registerProcessor: (
	name: string,
	processor: typeof AudioProcessor
) => void;

interface AudioWorkletProcessor {
	readonly port: MessagePort;
	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>
	): boolean;
}

class AudioProcessor extends AudioWorkletProcessor {
	private frameCount = 0;
	private readonly PROCESS_INTERVAL = 2;
	private readonly FFT_SIZE = 2048;
	private readonly timeData: Float32Array;
	private readonly freqData: Float32Array;

	constructor() {
		super();
		this.timeData = new Float32Array(this.FFT_SIZE);
		this.freqData = new Float32Array(this.FFT_SIZE / 2);
	}

	// 简单的 FFT 实现
	private computeFFT(input: Float32Array) {
		// 复制输入数据到时域缓冲区
		this.timeData.set(input);

		// 简单的能量计算（这里可以替换为真正的 FFT 实现）
		for (let i = 0; i < this.FFT_SIZE / 2; i++) {
			let energy = 0;
			const binSize = Math.floor(input.length / (this.FFT_SIZE / 2));
			for (let j = 0; j < binSize; j++) {
				const idx = i * binSize + j;
				if (idx < input.length) {
					energy += input[idx] * input[idx];
				}
			}
			this.freqData[i] = 10 * Math.log10(energy + 1e-10);
		}
	}

	process(
		inputs: Float32Array[][],
		outputs: Float32Array[][],
		parameters: Record<string, Float32Array>
	): boolean {
		if (this.frameCount++ % this.PROCESS_INTERVAL !== 0) {
			return true;
		}

		const input = inputs[0];
		if (!input || !input[0]?.length) {
			return true;
		}

		const audioData = input[0];

		// 计算频谱
		this.computeFFT(audioData);

		// 发送处理后的数据
		this.port.postMessage({
			timeData: audioData,
			freqData: this.freqData,
			timestamp: currentTime,
		});

		return true;
	}
}

registerProcessor('audio-processor', AudioProcessor);
