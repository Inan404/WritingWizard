import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useWriting, TextContent } from '@/context/WritingContext';

interface TextEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  editable?: boolean;
  highlightText?: boolean;
  className?: string;
  placeholder?: string;
  isTextArea?: boolean;
}

export default function TextEditor({
  content,
  onChange,
  editable = true,
  highlightText = false,
  className = '',
  placeholder = 'Enter or paste your text here...',
  isTextArea = false
}: TextEditorProps) {
  const [internalContent, setInternalContent] = useState(content);
  const editorRef = useRef<HTMLDivElement | HTMLTextAreaElement>(null);
  const { grammarText, aiCheckText } = useWriting();
  
  useEffect(() => {
    setInternalContent(content);
  }, [content]);

  const handleContentChange = (e: React.FormEvent<HTMLDivElement | HTMLTextAreaElement>) => {
    let newContent = '';
    
    // Handle textarea input differently than contentEditable div
    if (isTextArea) {
      newContent = (e.target as HTMLTextAreaElement).value;
    } else {
      newContent = (e.target as HTMLDivElement).innerText;
    }
    
    setInternalContent(newContent);
    onChange(newContent);
  };

  // Apply highlighting based on the text content and highlights from context
  const getHighlightedContent = () => {
    if (!highlightText) return internalContent;
    
    const textToUse = highlightText && editorRef.current?.getAttribute('data-tool') === 'ai-check' 
      ? aiCheckText
      : grammarText;
      
    if (!textToUse.highlights || textToUse.highlights.length === 0) return internalContent;
    
    // This is a simplified version. In a real app, you'd need more sophisticated
    // text highlighting that preserves HTML structure
    let html = internalContent;
    
    try {
      // Apply highlights in reverse order to avoid offset issues
      const highlights = [...(textToUse.highlights || [])].sort((a, b) => b.start - a.start);
      
      for (const highlight of highlights) {
        if (highlight.start >= 0 && highlight.end > highlight.start && highlight.end <= html.length) {
          const before = html.substring(0, highlight.start);
          const highlighted = html.substring(highlight.start, highlight.end);
          const after = html.substring(highlight.end);
          
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
          
          html = `${before}<span class="${highlightClass}" 
                    data-suggestion="${highlight.suggestion || ''}"
                    data-message="${highlight.message || ''}">${highlighted}</span>${after}`;
        }
      }
    } catch (error) {
      console.error('Error applying highlights:', error);
      return internalContent;
    }
    
    return DOMPurify.sanitize(html);
  };

  if (isTextArea) {
    return (
      <textarea
        ref={editorRef as React.RefObject<HTMLTextAreaElement>}
        className={`w-full h-full p-2 border-0 focus:ring-0 focus:outline-none resize-none bg-card ${className}`}
        placeholder={placeholder}
        value={internalContent}
        onChange={handleContentChange}
        disabled={!editable}
      />
    );
  }

  // Use a simpler approach for contentEditable to avoid issues
  return (
    <div className="relative w-full h-full">
      <div
        ref={editorRef as React.RefObject<HTMLDivElement>}
        className={`content-editable p-2 ${className}`}
        contentEditable={editable}
        onInput={handleContentChange}
        suppressContentEditableWarning={true}
        data-tool={highlightText ? (editorRef.current?.getAttribute('data-tool') === 'ai-check' ? "ai-check" : "grammar") : ""}
        dangerouslySetInnerHTML={{ __html: highlightText ? getHighlightedContent() : internalContent }}
      >
      </div>
      
      {!internalContent && (
        <div className="absolute top-2 left-2 pointer-events-none text-muted-foreground opacity-60">
          {placeholder}
        </div>
      )}
    </div>
  );
}