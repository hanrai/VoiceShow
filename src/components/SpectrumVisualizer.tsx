import React, { useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

interface SpectrumVisualizerProps {
  data: {
    frequency: Uint8Array;
    timeDomain: Uint8Array;
  } | null;
  height?: number;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  data,
  height = 48
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts>();

  // 预计算配置
  const option = useMemo<EChartsOption>(() => ({
    animation: false,
    grid: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      containLabel: false
    },
    xAxis: {
      type: 'category',
      show: false,
      boundaryGap: true
    },
    yAxis: {
      type: 'value',
      show: false,
      min: 0,
      max: 255,
      scale: true
    },
    series: [{
      type: 'bar',
      barWidth: '50%',
      barGap: '10%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(52, 211, 153, 1)' },
          { offset: 1, color: 'rgba(52, 211, 153, 0.2)' }
        ]),
        borderRadius: [4, 4, 0, 0]
      },
      data: [],
      animation: false,
      large: true,
      largeThreshold: 100,
      silent: true
    }]
  }), []);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current, 'dark', {
      renderer: 'canvas',
      devicePixelRatio: window.devicePixelRatio,
      width: chartRef.current.clientWidth,
      height: chartRef.current.clientHeight
    });

    chart.setOption(option);
    chartInstanceRef.current = chart;

    const handleResize = () => {
      if (chartRef.current) {
        chart.resize({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [option]);

  // 更新数据
  useEffect(() => {
    if (!data?.frequency || !chartInstanceRef.current) return;

    // 对数据进行降采样和平均
    const barCount = 48;
    const samplingRate = Math.floor(data.frequency.length / barCount);
    const processedData = new Array(barCount).fill(0).map((_, i) => {
      let sum = 0;
      let count = 0;
      for (let j = 0; j < samplingRate; j++) {
        const index = i * samplingRate + j;
        if (index < data.frequency.length) {
          sum += data.frequency[index];
          count++;
        }
      }
      const value = sum / count;
      return {
        value,
        itemStyle: {
          opacity: Math.pow(value / 255, 1.5)
        }
      };
    });

    chartInstanceRef.current.setOption({
      series: [{
        data: processedData
      }]
    }, {
      notMerge: false,
      lazyUpdate: true,
      silent: true
    });
  }, [data]);

  return (
    <div className="h-full w-full bg-[#0A0F1A] rounded-xl overflow-hidden">
      <div
        ref={chartRef}
        className="w-full h-full"
      />
    </div>
  );
}; 