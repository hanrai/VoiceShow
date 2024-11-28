import React, { useEffect, useRef } from 'react';
import REGL from 'regl';
import type { Regl } from 'regl';

interface WebGLRendererProps {
  render: (regl: Regl, gl: WebGLRenderingContext) => void;
}

const WebGLRenderer: React.FC<WebGLRendererProps> = ({ render }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reglRef = useRef<Regl>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const gl = canvasRef.current.getContext('webgl', {
      alpha: true,
      preserveDrawingBuffer: true
    });

    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    reglRef.current = REGL({
      canvas: canvasRef.current,
      attributes: { alpha: true }
    });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (reglRef.current) {
      render(reglRef.current, gl);
    }

    return () => {
      if (reglRef.current) {
        reglRef.current.destroy();
      }
    };
  }, [render]);

  return <canvas ref={canvasRef} className="visualization-canvas" />;
};

export default WebGLRenderer; 