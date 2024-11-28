import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioCaptureState {
	audioData: Float32Array | null;
	analyser: AnalyserNode | null;
	audioContext: AudioContext | null;
	isCapturing: boolean;
}

export function useAudioCapture() {
	const [isCapturing, setIsCapturing] = useState(false);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const streamRef = useRef<MediaStream>();
	const dataRef = useRef<Float32Array | null>(null);
	const frameRef = useRef<number>();
	const lastUpdateRef = useRef<number>(0);

	const updateData = useCallback(() => {
		const analyser = analyserRef.current;
		if (!analyser) return;

		const now = performance.now();
		if (now - lastUpdateRef.current < 33.33) {
			// 限制30fps
			frameRef.current = requestAnimationFrame(updateData);
			return;
		}

		if (!dataRef.current) {
			dataRef.current = new Float32Array(analyser.frequencyBinCount);
		}
		analyser.getFloatFrequencyData(dataRef.current);
		lastUpdateRef.current = now;
		frameRef.current = requestAnimationFrame(updateData);
	}, []);

	const startCapture = useCallback(async () => {
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

			analyser.fftSize = 256; // 进一步减小FFT大小
			analyser.minDecibels = -100;
			analyser.maxDecibels = 0;
			analyser.smoothingTimeConstant = 0.8;

			source.connect(analyser);

			analyserRef.current = analyser;
			audioContextRef.current = audioContext;
			setIsCapturing(true);

			lastUpdateRef.current = performance.now();
			updateData();
		} catch (error) {
			console.error('Error starting audio capture:', error);
		}
	}, [updateData]);

	const stopCapture = useCallback(() => {
		if (frameRef.current) {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = undefined;
		}
		if (streamRef.current) {
			streamRef.current.getTracks().forEach(track => track.stop());
			streamRef.current = undefined;
		}
		if (audioContextRef.current) {
			audioContextRef.current.close();
			audioContextRef.current = undefined;
		}
		analyserRef.current = null;
		dataRef.current = null;
		setIsCapturing(false);
	}, []);

	useEffect(() => {
		return () => {
			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current);
			}
			if (streamRef.current) {
				streamRef.current.getTracks().forEach(track => track.stop());
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, []);

	return {
		audioData: dataRef.current,
		analyser: analyserRef.current,
		audioContext: audioContextRef.current,
		isCapturing,
		startCapture,
		stopCapture,
	};
}
