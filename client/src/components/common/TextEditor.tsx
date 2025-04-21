import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useWriting, TextContent, WritingTool } from '@/context/WritingContext';

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
  const { grammarText, aiCheckText, activeTool } = useWriting();
  
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
    
    const textToUse = activeTool === 'ai-check' 
      ? aiCheckText
      : grammarText;
      
    if (!textToUse.highlights || textToUse.highlights.length === 0) return internalContent;
    
    // Just return the plain text to avoid mirroring issues
    // We'll implement highlighting in a future update
    return internalContent;
  };

  // Return a simple textarea for better stability if isTextArea is true
  if (isTextArea) {
    return (
      <textarea
        ref={editorRef as React.RefObject<HTMLTextAreaElement>}
        className={`w-full h-full p-2 border-0 focus:ring-0 focus:outline-none resize-none bg-card ${className}`}
        placeholder={placeholder}
        value={internalContent}
        onChange={(e) => {
          setInternalContent(e.target.value);
          onChange(e.target.value);
        }}
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
        onInput={(e) => {
          const newContent = (e.target as HTMLDivElement).innerText;
          setInternalContent(newContent);
          onChange(newContent);
        }}
        suppressContentEditableWarning={true}
        data-tool={highlightText ? (activeTool === 'ai-check' ? "ai-check" : "grammar") : ""}
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