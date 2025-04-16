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
    const newContent = (e.target as HTMLDivElement | HTMLTextAreaElement).innerText || (e.target as HTMLTextAreaElement).value;
    setInternalContent(newContent);
    onChange(newContent);
  };

  // Apply highlighting based on the text content and highlights from context
  const getHighlightedContent = () => {
    if (!highlightText) return internalContent;
    
    const textToUse = editorRef.current?.getAttribute('data-tool') === 'ai-check' 
      ? aiCheckText
      : grammarText;
      
    // This is a simplified version. In a real app, you'd need more sophisticated
    // text highlighting that preserves HTML structure
    let html = internalContent;
    
    // Apply highlights in reverse order to avoid offset issues
    const highlights = [...(textToUse.highlights || [])].sort((a, b) => b.start - a.start);
    
    highlights.forEach(highlight => {
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
    });
    
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

  return (
    <div
      ref={editorRef as React.RefObject<HTMLDivElement>}
      className={`content-editable ${className}`}
      contentEditable={editable}
      onInput={handleContentChange}
      suppressContentEditableWarning={true}
      dangerouslySetInnerHTML={{ __html: getHighlightedContent() }}
      placeholder={placeholder}
    />
  );
}
