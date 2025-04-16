import { useState, useRef, useEffect, RefObject } from 'react';

interface UseResizableReturn {
  leftWidth: number;
  containerRef: RefObject<HTMLDivElement>;
  handleRef: RefObject<HTMLDivElement>;
  startResizing: (e: React.MouseEvent) => void;
}

export default function useResizable(
  initialLeftWidth: number = 50,
  minLeftWidth: number = 20,
  minRightWidth: number = 20
): UseResizableReturn {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startLeftWidthRef = useRef(0);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startLeftWidthRef.current = leftWidth;
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current || !containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaX = e.clientX - startXRef.current;
    const deltaPercentage = (deltaX / containerWidth) * 100;
    
    const newLeftWidth = Math.min(
      Math.max(startLeftWidthRef.current + deltaPercentage, minLeftWidth),
      100 - minRightWidth
    );
    
    setLeftWidth(newLeftWidth);
  };

  const stopResizing = () => {
    resizingRef.current = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
    };
  }, []);

  return {
    leftWidth,
    containerRef,
    handleRef,
    startResizing
  };
}
