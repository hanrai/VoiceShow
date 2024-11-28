import { useEffect, useRef, useState } from 'react';

interface AudioCaptureState {
	audioData: Float32Array | null;
	analyser: AnalyserNode | null;
	audioContext: AudioContext | null;
	isCapturing: boolean;
}

export function useAudioCapture() {
	const [state, setState] = useState<AudioCaptureState>({
		audioData: null,
		analyser: null,
		audioContext: null,
		isCapturing: false,
	});

	const animationFrameRef = useRef<number>();
	const streamRef = useRef<MediaStream>();

	useEffect(() => {
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
			}
			state.audioContext?.close();
		};
	}, []);

	const startCapture = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					channelCount: 1,
					sampleRate: 48000,
				},
			});
			streamRef.current = stream;

			const audioContext = new AudioContext({ sampleRate: 48000 });
			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();

			analyser.fftSize = 2048;
			analyser.minDecibels = -100;
			analyser.maxDecibels = 0;
			analyser.smoothingTimeConstant = 0.85;

			const gainNode = audioContext.createGain();
			gainNode.gain.value = 1.5;

			source.connect(gainNode);
			gainNode.connect(analyser);

			const updateData = () => {
				const data = new Float32Array(analyser.frequencyBinCount);
				analyser.getFloatFrequencyData(data);
				setState(prev => ({ ...prev, audioData: data }));
				animationFrameRef.current = requestAnimationFrame(updateData);
			};

			setState({
				audioData: null,
				analyser,
				audioContext,
				isCapturing: true,
			});

			updateData();
		} catch (error) {
			console.error('Error starting audio capture:', error);
		}
	};

	const stopCapture = () => {
		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}
		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => track.stop());
		}
		state.audioContext?.close();
		setState({
			audioData: null,
			analyser: null,
			audioContext: null,
			isCapturing: false,
		});
	};

	return {
		...state,
		startCapture,
		stopCapture,
	};
}
