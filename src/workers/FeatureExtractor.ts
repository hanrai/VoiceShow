/// <reference lib="webworker" />

import Meyda from 'meyda';

declare module 'meyda' {
	export interface MeydaOptions {
		sampleRate?: number;
		bufferSize?: number;
		windowingFunction?: string;
		numberOfMFCCCoefficients?: number;
	}

	export interface MeydaFeatures {
		rms: number;
		spectralCentroid: number;
		zcr: number;
		mfcc: number[];
		loudness: {
			total: number;
			specific: number[];
		};
	}

	export interface MeydaSignal {
		sampleRate?: number;
		[key: string]: any;
	}

	export function extract(
		features: string[],
		signal: Float32Array,
		options?: MeydaSignal & MeydaOptions
	): MeydaFeatures | null;
}

// 初始化 Meyda
Meyda.bufferSize = 2048;
const sampleRate = 48000;

// 创建对象池
class Float32ArrayPool {
	private pool: Float32Array[] = [];
	private readonly size: number;

	constructor(size: number) {
		this.size = size;
	}

	acquire(): Float32Array {
		return this.pool.pop() || new Float32Array(this.size);
	}

	release(array: Float32Array) {
		if (this.pool.length < 10) {
			this.pool.push(array);
		}
	}
}

const timeDataPool = new Float32ArrayPool(2048);
const freqDataPool = new Float32ArrayPool(1024);

// 特征提取函数
const extractFeatures = (timeData: Float32Array, freqData: Float32Array) => {
	const features = Meyda.extract(
		['rms', 'spectralCentroid', 'zcr', 'mfcc', 'loudness'],
		timeData,
		{ sampleRate }
	);

	if (!features) {
		return {
			mfcc: new Array(13).fill(0),
			spectralCentroid: 0,
			loudness: 0,
			rms: 0,
			zcr: 0,
		};
	}

	return {
		mfcc: features.mfcc,
		spectralCentroid: features.spectralCentroid,
		loudness: features.loudness?.total ?? 0,
		rms: features.rms,
		zcr: features.zcr,
	};
};

// 监听消息
addEventListener('message', (e: MessageEvent) => {
	const { timeData, freqData } = e.data;

	const timeBuffer = timeDataPool.acquire();
	const freqBuffer = freqDataPool.acquire();

	timeBuffer.set(timeData);
	freqBuffer.set(freqData);

	const features = extractFeatures(timeBuffer, freqBuffer);
	postMessage(features);

	timeDataPool.release(timeBuffer);
	freqDataPool.release(freqBuffer);
});
