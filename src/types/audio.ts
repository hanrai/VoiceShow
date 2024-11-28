export interface AudioFeatures {
	rms: number;
	spectralCentroid: number;
	zcr: number;
	mfcc: number[];
	loudness: number;
}

export interface AudioEvent {
	type: 'cough' | 'speech' | 'noise' | 'laugh' | 'sneeze' | 'breath';
	confidence: number;
	timestamp: number;
}

export interface AudioState {
	audioData: Float32Array | null;
	spectrumData: Float32Array | null;
	mfccData: number[];
	pitchData: number;
	loudnessData: number;
	features: AudioFeatures | null;
	vadStatus: boolean;
	isCapturing: boolean;
}
