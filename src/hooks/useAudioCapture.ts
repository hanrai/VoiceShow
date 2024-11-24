import { useState, useEffect, useCallback, useRef } from 'react';

export const useAudioCapture = () => {
	const [isCapturing, setIsCapturing] = useState(false);
	const [audioData, setAudioData] = useState<Float32Array | null>(null);

	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const animationFrameRef = useRef<number>();
	const dataArrayRef = useRef<Float32Array>();

	const updateData = useCallback(() => {
		if (!analyserRef.current || !dataArrayRef.current) return;

		analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
		setAudioData(new Float32Array(dataArrayRef.current));

		animationFrameRef.current = requestAnimationFrame(updateData);
	}, []);

	const startCapture = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			audioContextRef.current = new AudioContext();
			analyserRef.current = audioContextRef.current.createAnalyser();

			const source = audioContextRef.current.createMediaStreamSource(stream);
			source.connect(analyserRef.current);

			analyserRef.current.fftSize = 2048;
			const bufferLength = analyserRef.current.frequencyBinCount;
			dataArrayRef.current = new Float32Array(bufferLength);

			setIsCapturing(true);
			updateData();
		} catch (error) {
			console.error('Error accessing microphone:', error);
		}
	}, [updateData]);

	useEffect(() => {
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
			}
		};
	}, []);

	return { audioData, startCapture, isCapturing };
};
