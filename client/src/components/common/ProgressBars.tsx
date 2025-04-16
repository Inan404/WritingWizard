import { useWriting } from '@/context/WritingContext';
import { motion } from 'framer-motion';

interface ProgressBarsProps {
  showAI?: boolean;
}

export default function ProgressBars({ showAI = false }: ProgressBarsProps) {
  const { scoreMetrics } = useWriting();
  
  return (
    <div className="mb-6">
      {showAI && scoreMetrics.aiPercentage !== undefined && (
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
                initial={{ pathLength: 0 }}
                animate={{ pathLength: scoreMetrics.aiPercentage / 100 }}
                transition={{ duration: 1, ease: "easeInOut", delay: 0.5 }}
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
                className="text-2xl font-bold text-primary"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
              >
                {scoreMetrics.aiPercentage}%
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
              className="bg-secondary h-1"
              initial={{ width: 0 }}
              animate={{ width: `${scoreMetrics.correctness}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs mt-1">Correctness</p>
        </div>
        <div className="text-center">
          <div className="h-1 bg-muted rounded overflow-hidden">
            <motion.div 
              className="bg-primary h-1"
              initial={{ width: 0 }}
              animate={{ width: `${scoreMetrics.clarity}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs mt-1">Clarity</p>
        </div>
        <div className="text-center">
          <div className="h-1 bg-muted rounded overflow-hidden">
            <motion.div 
              className="h-1 bg-[hsl(var(--success))]"
              initial={{ width: 0 }}
              animate={{ width: `${scoreMetrics.engagement}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs mt-1">Engagement</p>
        </div>
        <div className="text-center">
          <div className="h-1 bg-muted rounded overflow-hidden">
            <motion.div 
              className="h-1 bg-[hsl(var(--warning))]"
              initial={{ width: 0 }}
              animate={{ width: `${scoreMetrics.delivery}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs mt-1">Delivery</p>
        </div>
      </div>
    </div>
  );
}
