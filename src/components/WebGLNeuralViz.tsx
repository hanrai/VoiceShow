import React, { useCallback, useMemo } from 'react';
import WebGLRenderer from './WebGLRenderer';
import type { Regl, ReglProps } from 'regl';

interface WebGLNeuralVizProps {
  data: number[];
  width?: number;
  height?: number;
}

interface NeuralProps extends ReglProps {
  activation?: number;
}

export const WebGLNeuralViz: React.FC<WebGLNeuralVizProps> = ({
  data,
  width = 800,
  height = 400
}) => {
  // 计算神经元位置
  const neurons = useMemo(() => {
    const layerSizes = [13, 8, 4, 1]; // MFCC -> Hidden -> Output
    const positions: number[][] = [];
    const connections: number[][] = [];

    let currentX = 0;
    let prevLayerStart = 0;

    layerSizes.forEach((size, layerIndex) => {
      const layerHeight = height * 0.8;
      const spacing = layerHeight / (size + 1);
      const startY = (height - layerHeight) / 2;

      // 添加神经元位置
      for (let i = 0; i < size; i++) {
        const x = currentX;
        const y = startY + spacing * (i + 1);
        positions.push([x, y]);

        // 添加连接
        if (layerIndex > 0) {
          const prevSize = layerSizes[layerIndex - 1];
          for (let j = 0; j < prevSize; j++) {
            connections.push([prevLayerStart + j, positions.length - 1]);
          }
        }
      }

      prevLayerStart += size;
      currentX += width / (layerSizes.length - 1);
    });

    return { positions, connections };
  }, [width, height]);

  const render = useCallback((regl: Regl) => {
    // 创建神经元和连接的缓冲区
    const neuronBuffer = regl.buffer(neurons.positions);
    const connectionBuffer = regl.buffer(neurons.connections);

    // 创建实例化渲染命令
    const drawNeurons = regl<NeuralProps>({
      vert: `
        precision mediump float;
        attribute vec2 position;
        uniform float size;
        uniform vec2 scale;
        
        void main() {
          gl_Position = vec4(position * scale - 1.0, 0, 1);
          gl_PointSize = size;
        }
      `,
      frag: `
        precision mediump float;
        uniform vec3 color;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      attributes: {
        position: neuronBuffer
      },
      uniforms: {
        size: 10,
        scale: [2.0 / width, 2.0 / height],
        color: [0.4, 0.8, 1.0]
      },
      count: neurons.positions.length,
      primitive: 'points'
    });

    // 创建连接渲染命令
    const drawConnections = regl<NeuralProps>({
      vert: `
        precision mediump float;
        attribute vec2 from, to;
        uniform vec2 scale;
        uniform float activation;
        
        varying float v_activation;
        
        void main() {
          v_activation = activation;
          gl_Position = vec4(mix(from, to, activation) * scale - 1.0, 0, 1);
        }
      `,
      frag: `
        precision mediump float;
        varying float v_activation;
        
        void main() {
          gl_FragColor = vec4(0.6, 0.8, 1.0, 0.3 * (1.0 - v_activation));
        }
      `,
      attributes: {
        from: {
          buffer: neuronBuffer,
          offset: 0,
          stride: 16,
          divisor: 1
        },
        to: {
          buffer: neuronBuffer,
          offset: 8,
          stride: 16,
          divisor: 1
        }
      },
      uniforms: {
        scale: [2.0 / width, 2.0 / height],
        activation: regl.prop<'activation'>('activation')
      },
      count: 2,
      instances: neurons.connections.length,
      primitive: 'lines'
    });

    // 渲染
    regl.clear({
      color: [0.1, 0.1, 0.1, 1],
      depth: 1
    });

    // 渲染连接
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      drawConnections({
        activation: i / (steps - 1)
      });
    }

    // 渲染神经元
    drawNeurons({});
  }, [neurons, width, height]);

  return <WebGLRenderer render={render} />;
};

export default WebGLNeuralViz; 