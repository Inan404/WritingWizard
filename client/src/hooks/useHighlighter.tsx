import { useEffect, useRef } from 'react';

interface Highlight {
  start: number;
  end: number;
  type: 'suggestion' | 'error' | 'ai';
  content: string;
  suggestion?: string;
  message?: string;
}

export default function useHighlighter(
  elementRef: React.RefObject<HTMLElement>,
  text: string,
  highlights: Highlight[],
  onHighlightClick?: (highlight: Highlight) => void
) {
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    
    const applyHighlights = () => {
      if (!elementRef.current) return;
      
      // Clone the text content to work with
      let workingText = text;
      const fragments: {html: string, index: number}[] = [];
      
      // Sort highlights by start position in reverse order
      // This way we can apply them without affecting positions of other highlights
      const sortedHighlights = [...highlights].sort((a, b) => b.start - a.start);
      
      sortedHighlights.forEach(highlight => {
        const beforeText = workingText.substring(0, highlight.start);
        const highlightText = workingText.substring(highlight.start, highlight.end);
        const afterText = workingText.substring(highlight.end);
        
        let highlightClass = '';
        switch (highlight.type) {
          case 'suggestion':
            highlightClass = 'suggestion-highlight';
            break;
          case 'error':
            highlightClass = 'error-highlight';
            break;
          case 'ai':
            highlightClass = 'ai-highlight';
            break;
        }
        
        const highlightHtml = `<span class="${highlightClass}" 
                                  data-start="${highlight.start}" 
                                  data-end="${highlight.end}"
                                  data-type="${highlight.type}"
                                  data-suggestion="${highlight.suggestion || ''}"
                                  data-message="${highlight.message || ''}">${highlightText}</span>`;
        
        workingText = beforeText + highlightHtml + afterText;
      });
      
      if (elementRef.current instanceof HTMLElement) {
        elementRef.current.innerHTML = workingText;
      }
    };
    
    applyHighlights();
    
    // Add click event listeners to highlights
    const handleHighlightClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('suggestion-highlight') || 
          target.classList.contains('error-highlight') || 
          target.classList.contains('ai-highlight')) {
        
        if (onHighlightClick) {
          const start = parseInt(target.getAttribute('data-start') || '0');
          const end = parseInt(target.getAttribute('data-end') || '0');
          const type = target.getAttribute('data-type') as 'suggestion' | 'error' | 'ai';
          const suggestion = target.getAttribute('data-suggestion') || undefined;
          const message = target.getAttribute('data-message') || undefined;
          
          onHighlightClick({
            start,
            end,
            type,
            content: target.textContent || '',
            suggestion,
            message
          });
        }
      }
    };
    
    elementRef.current.addEventListener('click', handleHighlightClick);
    
    // Set up observer to reapply highlights if content changes
    observerRef.current = new MutationObserver(applyHighlights);
    observerRef.current.observe(elementRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('click', handleHighlightClick);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [text, highlights, onHighlightClick]);
}
