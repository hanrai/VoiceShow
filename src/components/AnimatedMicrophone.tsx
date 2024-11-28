import React from 'react';
import { Mic } from 'lucide-react';

interface AnimatedMicrophoneProps {
  isActive: boolean;
}

export const AnimatedMicrophone: React.FC<AnimatedMicrophoneProps> = ({ isActive }) => {
  return (
    <div className={`relative w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center ${isActive ? 'animate-pulse' : ''
      }`}>
      <div className={`absolute inset-0 rounded-full bg-blue-500 opacity-20 ${isActive ? 'animate-ping' : 'hidden'
        }`} />
      <Mic className={`w-8 h-8 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
    </div>
  );
}; 