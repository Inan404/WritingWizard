import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ResizablePanelsProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
  className?: string;
}

export default function ResizablePanels({
  leftPanel,
  rightPanel,
  initialLeftWidth = 50,
  minLeftWidth = 30,
  minRightWidth = 30,
  className = '',
}: ResizablePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startLeftWidth = useRef(0);

  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startLeftWidth.current = leftWidth;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startX.current;
    const deltaPercentage = (deltaX / containerWidth) * 100;
    
    const newLeftWidth = Math.min(
      Math.max(startLeftWidth.current + deltaPercentage, minLeftWidth),
      100 - minRightWidth
    );
    
    setLeftWidth(newLeftWidth);
  };

  const stopResize = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <div ref={containerRef} className={`flex h-[calc(100vh-220px)] ${className}`}>
      <motion.div 
        className="bg-card rounded-lg shadow-sm p-4 overflow-y-auto"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: `${leftWidth}%` }}
      >
        {leftPanel}
      </motion.div>
      
      <div 
        className="resize-handle"
        onMouseDown={startResize}
        style={{ cursor: isResizing.current ? 'col-resize' : 'col-resize' }}
      />
      
      <motion.div 
        className="bg-card rounded-lg shadow-sm p-4 overflow-y-auto"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPanel}
      </motion.div>
    </div>
  );
}
