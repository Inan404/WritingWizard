import { useState, useRef, useEffect } from "react";

interface EditableTextProps {
  initialText: string;
  onChange: (text: string) => void;
  className?: string;
  placeholder?: string;
}

export default function EditableText({ 
  initialText, 
  onChange, 
  className = "", 
  placeholder = "Enter text here..." 
}: EditableTextProps) {
  const [text, setText] = useState<string>(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onChange(newText);
  };

  // Auto-resize the textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [text]);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full resize-none overflow-hidden focus:outline-none bg-transparent ${className}`}
        rows={1}
      />
    </div>
  );
}
