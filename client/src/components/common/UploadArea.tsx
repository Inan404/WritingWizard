import { useState } from 'react';
import { motion } from 'framer-motion';
import { CloudUpload, Paperclip } from 'lucide-react';

interface UploadAreaProps {
  title: string;
  description: string;
  icon?: 'file' | 'link';
  onUpload?: (file: File) => void;
  onLinkAdd?: (link: string) => void;
  acceptLinkInput?: boolean;
  className?: string;
}

export default function UploadArea({
  title,
  description,
  icon = 'file',
  onUpload,
  onLinkAdd,
  acceptLinkInput = false,
  className = '',
}: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [link, setLink] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onUpload) {
      onUpload(files[0]);
      setFileName(files[0].name);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onUpload) {
      onUpload(files[0]);
      setFileName(files[0].name);
    }
  };
  
  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (link.trim() && onLinkAdd) {
      onLinkAdd(link);
      setLink('');
    }
  };
  
  return (
    <div className={`bg-muted rounded-lg p-4 ${className}`}>
      <h3 className="text-md font-medium mb-2 flex items-center">
        <span className="text-primary mr-2">
          {icon === 'file' ? <CloudUpload className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
        </span>
        {title}
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        {description}
      </p>
      
      <motion.div
        className={`border-2 border-dashed rounded-lg p-4 text-center 
                   hover:bg-muted/80 transition-colors duration-200 cursor-pointer 
                   animate-float ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById(`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`)?.click()}
        whileHover={{ scale: 1.01 }}
      >
        {fileName ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-primary text-2xl mb-2"
            >
              ✓
            </motion.div>
            <p className="text-sm text-foreground">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-1">File uploaded successfully</p>
          </>
        ) : (
          <>
            {icon === 'file' ? (
              <CloudUpload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            ) : (
              <Paperclip className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground">
              Drag and drop files here or click to browse
            </p>
          </>
        )}
        <input 
          type="file" 
          className="hidden" 
          id={`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
          onChange={handleFileSelect}
        />
      </motion.div>
      
      {acceptLinkInput && (
        <form className="mt-3" onSubmit={handleLinkSubmit}>
          <input 
            type="text" 
            placeholder="Paste website URL or reference link" 
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </form>
      )}
    </div>
  );
}
