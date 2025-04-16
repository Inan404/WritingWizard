import { useRef, ReactNode, useEffect } from "react";

interface ResizablePanelProps {
  children: ReactNode;
  className?: string;
  minWidth?: number;
  maxWidth?: number;
}

export default function ResizablePanel({
  children,
  className = "",
  minWidth = 25,
  maxWidth = 75
}: ResizablePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const panel = panelRef.current;
    const resizer = resizerRef.current;
    
    if (!panel || !resizer) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    const startResize = (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
    };
    
    const resize = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const container = panel.parentElement;
      if (!container) return;
      
      const containerWidth = container.offsetWidth;
      const newWidth = startWidth + (e.clientX - startX);
      
      // Convert pixel values to percentages for responsive behavior
      const minWidthPx = (containerWidth * minWidth) / 100;
      const maxWidthPx = (containerWidth * maxWidth) / 100;
      
      const constrainedWidth = Math.max(minWidthPx, Math.min(maxWidthPx, newWidth));
      const widthPercentage = (constrainedWidth / containerWidth) * 100;
      
      panel.style.width = `${widthPercentage}%`;
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
  }, [minWidth, maxWidth]);
  
  return (
    <div ref={panelRef} className={`relative ${className}`}>
      {children}
      <div 
        ref={resizerRef}
        className="resizer absolute w-1 h-full bg-gray-200 dark:bg-gray-700 right-0 top-0 cursor-col-resize z-10 hover:bg-blue-400 dark:hover:bg-blue-600 transition-colors duration-200"
      />
    </div>
  );
}
