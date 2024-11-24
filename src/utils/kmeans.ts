interface Point {
	features: number[];
	timestamp: number;
}

interface Cluster {
	centroid: number[];
	points: Point[];
}

export class KMeans {
	private k: number;
	private maxIterations: number;

	constructor(k: number = 3, maxIterations: number = 10) {
		this.k = k;
		this.maxIterations = maxIterations;
	}

	// 计算两点之间的欧氏距离
	private distance(a: number[], b: number[]): number {
		return Math.sqrt(
			a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
		);
	}

	// 计算质心
	private calculateCentroid(points: Point[]): number[] {
		if (points.length === 0) return [];
		const numFeatures = points[0].features.length;
		const centroid = new Array(numFeatures).fill(0);

		points.forEach(point => {
			point.features.forEach((val, i) => {
				centroid[i] += val;
			});
		});

		return centroid.map(sum => sum / points.length);
	}

	// 聚类主函数
	cluster(points: Point[]): Cluster[] {
		if (points.length === 0) return [];

		// 初始化质心（从数据点中随机选择）
		let clusters: Cluster[] = Array(this.k)
			.fill(null)
			.map(() => ({
				centroid: points[Math.floor(Math.random() * points.length)].features,
				points: [],
			}));

		for (let iter = 0; iter < this.maxIterations; iter++) {
			// 清空每个簇的点
			clusters.forEach(cluster => (cluster.points = []));

			// 分配点到最近的簇
			points.forEach(point => {
				let minDist = Infinity;
				let nearestCluster = clusters[0];

				clusters.forEach(cluster => {
					const dist = this.distance(point.features, cluster.centroid);
					if (dist < minDist) {
						minDist = dist;
						nearestCluster = cluster;
					}
				});

				nearestCluster.points.push(point);
			});

			// 更新质心
			let moved = false;
			clusters.forEach(cluster => {
				if (cluster.points.length > 0) {
					const newCentroid = this.calculateCentroid(cluster.points);
					const movement = this.distance(cluster.centroid, newCentroid);
					if (movement > 0.001) {
						cluster.centroid = newCentroid;
						moved = true;
					}
				}
			});

			// 如果质心不再移动，提前结束
			if (!moved) break;
		}

		return clusters;
	}
}
