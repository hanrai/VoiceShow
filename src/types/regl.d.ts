declare module 'regl' {
	interface ReglConfig {
		canvas: HTMLCanvasElement;
		attributes?: {
			preserveDrawingBuffer?: boolean;
		};
	}

	interface ReglDrawConfig {
		frag: string;
		vert: string;
		attributes?: {
			[key: string]: any;
		};
		uniforms?: {
			[key: string]: any;
		};
		count?: number;
	}

	interface Regl {
		(config: ReglDrawConfig): () => void;
		clear: (options: { color: number[] | string; depth?: number }) => void;
		destroy: () => void;
	}

	function createREGL(config: ReglConfig): Regl;
	export default createREGL;
}
