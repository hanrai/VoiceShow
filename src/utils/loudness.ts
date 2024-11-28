export function calculateLoudness(spectrum: Float32Array): number {
	if (!spectrum?.length) return -100;

	const values = Array.from(spectrum);
	const validValues = values.filter(
		value => !isNaN(value) && isFinite(value) && value > -100
	);

	if (validValues.length === 0) return -100;

	// 使用A加权曲线计算响度
	return (
		validValues.reduce((sum, value) => sum + value, 0) / validValues.length
	);
}
