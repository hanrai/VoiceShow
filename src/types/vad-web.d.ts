declare module '@ricky0123/vad-web' {
	interface VADOptions {
		onSpeechStart?: () => void;
		onSpeechEnd?: () => void;
	}

	interface VADModel {
		start: () => Promise<void>;
		destroy: () => void;
	}

	export function create(options: VADOptions): Promise<VADModel>;
}
