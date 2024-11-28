import React, { useCallback } from 'react';
import WebGLRenderer from './WebGLRenderer';
import type { Regl, ReglProps } from 'regl';

interface WebGLSpectrogramProps {
  data: Float32Array;
  minValue?: number;
  maxValue?: number;
  colormap?: 'viridis' | 'magma' | 'plasma';
}

// 颜色映射数据
const COLORMAPS: Record<string, number[][]> = {
  viridis: [
    [0.267, 0.005, 0.329],
    [0.283, 0.141, 0.458],
    [0.254, 0.265, 0.530],
    [0.207, 0.372, 0.553],
    [0.164, 0.471, 0.558],
    [0.128, 0.567, 0.551],
    [0.135, 0.659, 0.518],
    [0.267, 0.749, 0.441],
    [0.478, 0.821, 0.318],
    [0.741, 0.873, 0.150],
    [0.993, 0.906, 0.144]
  ],
  magma: [/* ... */],
  plasma: [/* ... */]
};

export const WebGLSpectrogram: React.FC<WebGLSpectrogramProps> = ({
  data,
  minValue = -100,
  maxValue = 0,
  colormap = 'viridis'
}) => {
  const render = useCallback((regl: Regl) => {
    // 创建顶点缓冲区
    const vertexBuffer = regl.buffer([
      [-1, -1], [1, -1],
      [-1, 1], [1, 1]
    ]);

    // 创建纹理
    const texture = regl.texture({
      data: data,
      width: data.length,
      height: 1,
      format: 'luminance',
      type: 'float'
    });

    // 创建渲染命令
    const drawSpectrogram = regl<ReglProps>({
      vert: `
        precision mediump float;
        attribute vec2 position;
        varying vec2 uv;
        void main() {
          uv = 0.5 * (position + 1.0);
          gl_Position = vec4(position, 0, 1);
        }
      `,
      frag: `
        precision mediump float;
        uniform sampler2D spectrum;
        uniform float minValue;
        uniform float maxValue;
        uniform vec3 colormap[11];
        varying vec2 uv;

        vec3 getColor(float value) {
          float normalizedValue = (value - minValue) / (maxValue - minValue);
          float index = normalizedValue * 10.0;
          int i = int(floor(index));
          float f = fract(index);
          
          if (i < 0) return colormap[0];
          if (i > 9) return colormap[10];
          
          return mix(colormap[i], colormap[i + 1], f);
        }

        void main() {
          float value = texture2D(spectrum, uv).r;
          vec3 color = getColor(value);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      attributes: {
        position: vertexBuffer
      },
      uniforms: {
        spectrum: texture,
        minValue: regl.prop<'minValue'>('minValue'),
        maxValue: regl.prop<'maxValue'>('maxValue'),
        colormap: COLORMAPS[colormap]
      },
      count: 4,
      primitive: 'triangle strip'
    });

    // 清除并渲染
    regl.clear({
      color: [0, 0, 0, 0],
      depth: 1
    });

    drawSpectrogram({
      minValue,
      maxValue,
      spectrum: data
    });
  }, [data, minValue, maxValue, colormap]);

  return (
    <WebGLRenderer render={render} />
  );
};

export default WebGLSpectrogram;