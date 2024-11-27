import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, AlertCircle } from 'lucide-react';

interface InferenceFlowProps {
  features: number[];
  isProcessing: boolean;
  detectionResult: boolean;
}

export const InferenceFlow: React.FC<InferenceFlowProps> = ({
  features,
  isProcessing,
  detectionResult
}) => {
  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-4">
      <div className="flex items-center justify-between gap-4">
        {/* 特征向量可视化 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">特征向量</span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {features.map((value, index) => (
              <motion.div
                key={index}
                className="h-16 rounded bg-gray-700 relative overflow-hidden"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-blue-500"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.abs(value * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* 推理过程动画 */}
        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                className="relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="absolute inset-0 border-2 border-green-400 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
                <Brain className="w-12 h-12 text-green-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 推理结果 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-300">推理结果</span>
          </div>
          <motion.div
            className={`p-4 rounded-lg ${detectionResult ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}
            animate={{
              scale: detectionResult ? [1, 1.05, 1] : 1,
              borderColor: detectionResult ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0.2)'] : 'rgba(34, 197, 94, 0.2)',
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            style={{
              border: '1px solid',
            }}
          >
            <div className="text-center">
              <motion.div
                className={`text-2xl font-bold ${detectionResult ? 'text-red-500' : 'text-green-500'
                  }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {detectionResult ? '咳嗽' : '正常'}
              </motion.div>
              <motion.div
                className="text-sm text-gray-400 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {detectionResult ? '检测到咳嗽声' : '未检测到异常'}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}; 