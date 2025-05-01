import { useWriting } from '@/context/WritingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ProgressBarsProps {
  showAI?: boolean;
}

export default function ProgressBars({ showAI = false }: ProgressBarsProps) {
  const { scoreMetrics } = useWriting();
  const [animatedMetrics, setAnimatedMetrics] = useState(scoreMetrics);
  
  // Update animated metrics when scoreMetrics changes
  useEffect(() => {
    console.log("ProgressBars: Metrics updated:", scoreMetrics);
    setAnimatedMetrics(scoreMetrics);
  }, [scoreMetrics]);
  
  return (
    <div className="mb-6">
      {showAI && animatedMetrics.aiPercentage !== undefined && (
        <div className="flex justify-center mb-4">
          <div className="relative h-32 w-32">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <motion.circle
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <motion.circle
                key={`ai-circle-${animatedMetrics.aiPercentage}`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: animatedMetrics.aiPercentage / 100 }}
                transition={{ duration: 1, ease: "easeInOut", delay: 0.3 }}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                strokeDasharray="251.2"
                strokeDashoffset="0"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <motion.span 
                key={`ai-text-${animatedMetrics.aiPercentage}`}
                className="text-2xl font-bold text-primary"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                {animatedMetrics.aiPercentage}%
              </motion.span>
              <span className="text-xs text-muted-foreground">AI Content</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="h-1 bg-muted rounded overflow-hidden">
            <motion.div 
              key={`correctness-${animatedMetrics.correctness}`}
              className="bg-secondary h-1"
              initial={{ width: 0 }}
              animate={{ width: `${animatedMetrics.correctness}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs mt-1">Correctness</p>
        </div>
        <div className="text-center">
          <div className="h-1 bg-muted rounded overflow-hidden">
            <motion.div 
              key={`clarity-${animatedMetrics.clarity}`}
              className="bg-primary h-1"
              initial={{ width: 0 }}
              animate={{ width: `${animatedMetrics.clarity}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs mt-1">Clarity</p>
        </div>
        <div className="text-center">
          <div className="h-1 bg-muted rounded overflow-hidden">
            <motion.div 
              key={`engagement-${animatedMetrics.engagement}`}
              className="h-1 bg-[hsl(var(--success))]"
              initial={{ width: 0 }}
              animate={{ width: `${animatedMetrics.engagement}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs mt-1">Engagement</p>
        </div>
        <div className="text-center">
          <div className="h-1 bg-muted rounded overflow-hidden">
            <motion.div 
              key={`delivery-${animatedMetrics.delivery}`}
              className="h-1 bg-[hsl(var(--warning))]"
              initial={{ width: 0 }}
              animate={{ width: `${animatedMetrics.delivery}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs mt-1">Delivery</p>
        </div>
      </div>
    </div>
  );
}
