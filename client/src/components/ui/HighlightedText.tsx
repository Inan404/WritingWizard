import { ReactNode } from "react";

interface HighlightPosition {
  start: number;
  end: number;
}

interface HighlightedTextProps {
  text: string;
  highlights: {
    id: string;
    position: HighlightPosition;
    className?: string;
  }[];
  className?: string;
}

export default function HighlightedText({ text, highlights, className = "" }: HighlightedTextProps) {
  if (!text) return null;
  
  // Sort highlights by position to properly highlight them
  const sortedHighlights = [...highlights].sort((a, b) => a.position.start - b.position.start);
  
  const spans: ReactNode[] = [];
  let lastIndex = 0;
  
  sortedHighlights.forEach((highlight, index) => {
    // Add text before the highlight
    if (highlight.position.start > lastIndex) {
      spans.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, highlight.position.start)}
        </span>
      );
    }
    
    // Add the highlighted text
    spans.push(
      <span 
        key={`highlight-${highlight.id}`}
        className={highlight.className || ""}
      >
        {text.substring(highlight.position.start, highlight.position.end)}
      </span>
    );
    
    lastIndex = highlight.position.end;
  });
  
  // Add the remaining text
  if (lastIndex < text.length) {
    spans.push(
      <span key="text-end">{text.substring(lastIndex)}</span>
    );
  }
  
  return (
    <div className={className}>
      {spans}
    </div>
  );
}
