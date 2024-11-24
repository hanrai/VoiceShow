import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  data: Float32Array;
}

declare const echarts: any;

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ data }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>();
  const historyRef = useRef<number[][]>([]);
  const MAX_HISTORY = 10 * 48;
  const lastDrawTimeRef = useRef<number>(Date.now());
  const FRAME_INTERVAL = 1000 / 48; // 48fps

  useEffect(() => {
    const currentTime = Date.now();
    if (currentTime - lastDrawTimeRef.current < FRAME_INTERVAL) {
      return;
    }
    lastDrawTimeRef.current = currentTime;

    // 初始化图表
    if (chartRef.current && !chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
      window.addEventListener('resize', () => {
        chartInstanceRef.current?.resize();
      });
    }

    // 更新数据
    const amplitude = Array.from(data).reduce((sum, val) => sum + Math.abs(val), 0) / data.length;
    historyRef.current.push([amplitude]);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }

    // 配置项
    const option = {
      animation: false,
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      },
      xAxis: {
        type: 'category',
        show: false,
        data: Array.from({ length: MAX_HISTORY }, (_, i) => i)
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 0,
        max: 1
      },
      series: [{
        type: 'line',
        data: historyRef.current.map(d => d[0]),
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#60A5FA',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(96, 165, 250, 0.5)' },
            { offset: 1, color: 'rgba(96, 165, 250, 0)' }
          ])
        }
      }]
    };

    chartInstanceRef.current?.setOption(option);
  }, [data]);

  // 清理
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      window.removeEventListener('resize', () => {
        chartInstanceRef.current?.resize();
      });
    };
  }, []);

  return <div ref={chartRef} className="w-full h-full" />;
};