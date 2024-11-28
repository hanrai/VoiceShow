declare module 'regl' {
	export interface ReglProps {
		spectrum?: Float32Array;
		activation?: number;
		minValue?: number;
		maxValue?: number;
		[key: string]: any;
	}

	export interface ReglBuffer {
		length: number;
		[key: string]: any;
	}

	export interface ReglTexture {
		width: number;
		height: number;
		[key: string]: any;
	}

	export interface ReglCommandSpec<Props = ReglProps> {
		frag?: string;
		vert?: string;
		attributes?: Record<string, any>;
		uniforms?: Record<string, any>;
		count?: number;
		primitive?: string;

		depth?: { enable: boolean };
		instances?: number;
		blend?: {
			enable: boolean;
			func?: {
				srcRGB: string;
				srcAlpha: string;
				dstRGB: string;
				dstAlpha: string;
			};
		};
	}

	export interface Regl {
		<Props = ReglProps>(spec: ReglCommandSpec<Props>): (props?: Props) => void;
		prop<T extends keyof ReglProps>(name: T): ReglProps[T];
		buffer(data: number[][] | Float32Array): ReglBuffer;
		texture(options: {
			data: Float32Array;
			width: number;
			height: number;
			format?: string;
			type?: string;
		}): ReglTexture;
		clear(options: {
			color?: [number, number, number, number];
			depth?: number;
		}): void;
		destroy(): void;
	}

	const createREGL: (options: {
		canvas: HTMLCanvasElement;
		attributes?: { alpha: boolean };
	}) => Regl;
	export default createREGL;
}
