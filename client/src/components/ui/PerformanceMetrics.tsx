interface PerformanceMetricsProps {
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export default function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="relative flex items-center">
        <div className="h-1 w-32 bg-gray-200 dark:bg-gray-700 rounded">
          <div 
            className="h-1 bg-red-500 rounded" 
            style={{ width: `${metrics.correctness}%` }}
          ></div>
        </div>
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Correctness</span>
      </div>
      <div className="relative flex items-center">
        <div className="h-1 w-32 bg-gray-200 dark:bg-gray-700 rounded">
          <div 
            className="h-1 bg-blue-500 rounded" 
            style={{ width: `${metrics.clarity}%` }}
          ></div>
        </div>
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Clarity</span>
      </div>
      <div className="relative flex items-center">
        <div className="h-1 w-32 bg-gray-200 dark:bg-gray-700 rounded">
          <div 
            className="h-1 bg-green-500 rounded" 
            style={{ width: `${metrics.engagement}%` }}
          ></div>
        </div>
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Engagement</span>
      </div>
      <div className="relative flex items-center">
        <div className="h-1 w-32 bg-gray-200 dark:bg-gray-700 rounded">
          <div 
            className="h-1 bg-orange-500 rounded" 
            style={{ width: `${metrics.delivery}%` }}
          ></div>
        </div>
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Delivery</span>
      </div>
    </div>
  );
}
