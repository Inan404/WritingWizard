import { useRef, useEffect, useState } from "react";

interface ResizableOptions {
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
  direction?: 'horizontal' | 'vertical';
}

export default function useResizable({
  minWidth = 25,
  maxWidth = 75,
  initialWidth = 50,
  direction = 'horizontal'
}: ResizableOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(initialWidth);
  
  useEffect(() => {
    const container = containerRef.current;
    const resizer = resizerRef.current;
    
    if (!container || !resizer) return;
    
    let isResizing = false;
    let startPos = 0;
    let startSize = 0;
    
    const startResize = (e: MouseEvent) => {
      isResizing = true;
      startPos = direction === 'horizontal' ? e.clientX : e.clientY;
      startSize = direction === 'horizontal' ? container.offsetWidth : container.offsetHeight;
      
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
    };
    
    const resize = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const parentElement = container.parentElement;
      if (!parentElement) return;
      
      const parentSize = direction === 'horizontal' ? parentElement.offsetWidth : parentElement.offsetHeight;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const newSize = startSize + (currentPos - startPos);
      
      // Convert pixel values to percentages
      const newPercentage = (newSize / parentSize) * 100;
      const constrainedPercentage = Math.max(minWidth, Math.min(maxWidth, newPercentage));
      
      setWidth(constrainedPercentage);
      if (direction === 'horizontal') {
        container.style.width = `${constrainedPercentage}%`;
      } else {
        container.style.height = `${constrainedPercentage}%`;
      }
    };
    
    const stopResize = () => {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    };
    
    resizer.addEventListener('mousedown', startResize);
    
    return () => {
      resizer.removeEventListener('mousedown', startResize);
      document.removeEventListener('mousemove', resize);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [direction, minWidth, maxWidth]);
  
  return { containerRef, resizerRef, width };
}
