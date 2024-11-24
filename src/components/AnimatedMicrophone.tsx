import React from 'react';
import { Mic } from 'lucide-react';

export const AnimatedMicrophone: React.FC = () => {
  return (
    <div className="relative w-12 h-12">
      {/* 外层发光效果 */}
      <div className="absolute inset-0 rounded-full bg-green-500/20 animate-pulse" />

      {/* 麦克风背景光晕 */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 animate-spin-slow" />

      {/* 麦克风容器 */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-full">
        {/* 内圈动画环 */}
        <div className="absolute inset-0 rounded-full border-2 border-green-400/50">
          <div className="absolute inset-0 rounded-full border-t-2 border-green-400 animate-spin-slow" />
        </div>

        {/* 麦克风图标 */}
        <div className="relative z-10">
          <Mic className="w-6 h-6 text-green-400 animate-bounce-gentle" />
        </div>

        {/* 声波动画 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 rounded-full border-2 border-green-400/0 animate-ripple" />
          <div className="absolute inset-0 rounded-full border-2 border-green-400/0 animate-ripple delay-300" />
          <div className="absolute inset-0 rounded-full border-2 border-green-400/0 animate-ripple delay-600" />
        </div>
      </div>
    </div>
  );
}; 