import React, { useEffect, useRef } from 'react';
import REGL from 'regl';

interface SpectrogramVisualizerProps {
  data: number[];
  type: 'spectrum' | 'mfcc';
  colormap: 'viridis' | 'magma';
}

export const SpectrogramVisualizer: React.FC<SpectrogramVisualizerProps> = ({
  data,
  type,
  colormap
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reglRef = useRef<REGL.Regl>();
  const historyRef = useRef<number[][]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!reglRef.current) {
      reglRef.current = REGL({
        canvas: canvasRef.current,
        attributes: { preserveDrawingBuffer: true }
      });
    }

    // WebGL 着色器程序
    const drawSpectrogram = reglRef.current({
      frag: `
        precision mediump float;
        uniform sampler2D data;
        uniform vec3 colormap[16];
        varying vec2 uv;
        
        vec3 getColor(float t) {
          // 颜色映射插值
          float index = t * 15.0;
          int i = int(floor(index));
          float f = fract(index);
          return mix(colormap[i], colormap[i + 1], f);
        }
        
        void main() {
          float value = texture2D(data, uv).r;
          gl_FragColor = vec4(getColor(value), 1);
        }
      `,
      vert: `
        precision mediump float;
        attribute vec2 position;
        varying vec2 uv;
        void main() {
          uv = 0.5 * (position + 1.0);
          gl_Position = vec4(position, 0, 1);
        }
      `,
      // ... 更多 WebGL 配置
    });

    // 更新和渲染逻辑
  }, [data, type, colormap]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}; 