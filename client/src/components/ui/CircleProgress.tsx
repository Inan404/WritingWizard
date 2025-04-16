import { motion } from "framer-motion";

interface CircleProgressProps {
  percentage: number;
}

export default function CircleProgress({ percentage }: CircleProgressProps) {
  // Calculate the circumference
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate the dash offset based on percentage
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 36 36">
        {/* Background circle */}
        <path
          d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#E5E7EB"
          className="dark:stroke-gray-700"
          strokeWidth="3"
        />
        
        {/* Progress circle */}
        <motion.path
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="circle-progress stroke-blue-500"
          strokeDasharray={`${circumference}, ${circumference}`}
          d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          strokeWidth="3"
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <motion.span 
          className="text-3xl font-bold text-gray-900 dark:text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {percentage}%
        </motion.span>
        <span className="text-sm text-gray-500 dark:text-gray-400">AI Content</span>
      </div>
    </div>
  );
}
