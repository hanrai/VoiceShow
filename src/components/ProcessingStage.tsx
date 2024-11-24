import React from 'react';
import { motion } from 'framer-motion';

interface ProcessingStageProps {
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  children: React.ReactNode;
}

export const ProcessingStage: React.FC<ProcessingStageProps> = ({
  icon,
  title,
  isActive,
  children,
}) => {
  return (
    <motion.div
      className="relative bg-gray-900 rounded-xl p-6 shadow-lg"
      animate={{
        scale: isActive ? [1, 1.02, 1] : 1,
        borderColor: isActive ? ['rgba(96, 165, 250, 0.2)', 'rgba(96, 165, 250, 0.5)', 'rgba(96, 165, 250, 0.2)'] : 'rgba(96, 165, 250, 0.2)',
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        border: '1px solid rgba(96, 165, 250, 0.2)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
        {isActive && (
          <div className="ml-auto">
            <motion.div
              className="w-2 h-2 rounded-full bg-green-400"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
            />
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
};