import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWriting } from '@/context/WritingContext';
import UploadArea from '../common/UploadArea';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { WandSparkles } from 'lucide-react';

export default function ChatGenerator() {
  const { chatText, setChatText } = useWriting();
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async (data: typeof chatText) => {
      const response = await apiRequest('POST', '/api/generate-writing', data);
      return response.json();
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      setGeneratedContent(data.generatedText);
      toast({
        title: "Writing generated",
        description: "Your content has been generated based on your specifications.",
      });
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Error generating content",
        description: "There was a problem generating your writing. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSampleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setChatText({
        ...chatText,
        sample: text
      });
      toast({
        title: "Sample uploaded",
        description: "Your writing sample has been uploaded successfully.",
      });
    };
    reader.readAsText(file);
  };

  const handleReferenceUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setChatText({
        ...chatText,
        references: text
      });
      toast({
        title: "Reference uploaded",
        description: "Your reference material has been uploaded successfully.",
      });
    };
    reader.readAsText(file);
  };

  const handleReferenceLink = (link: string) => {
    setChatText({
      ...chatText,
      references: chatText.references 
        ? `${chatText.references}\n\nLink: ${link}`
        : `Link: ${link}`
    });
    toast({
      title: "Reference link added",
      description: "Your reference link has been added successfully.",
    });
  };

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatText({
      ...chatText,
      instructions: e.target.value
    });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, field: 'length' | 'style' | 'format') => {
    setChatText({
      ...chatText,
      [field]: e.target.value
    });
  };

  const handleGenerateWriting = () => {
    if (!chatText.instructions.trim()) {
      toast({
        title: "Instructions required",
        description: "Please provide instructions for what you want to generate.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    generateMutation.mutate(chatText);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] bg-card rounded-lg shadow-sm overflow-hidden">
      {generatedContent ? (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Generated Writing</h2>
              <p className="text-sm text-muted-foreground">Based on your specifications</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-muted text-foreground rounded-md"
              onClick={() => setGeneratedContent("")}
            >
              Back to Editor
            </motion.button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {generatedContent.split('\n\n').map((paragraph, i) => (
              <motion.p 
                key={i} 
                className="mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>
          
          <div className="p-4 border-t border-border">
            <div className="flex space-x-2">
              <button 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                onClick={() => {
                  navigator.clipboard.writeText(generatedContent);
                  toast({
                    title: "Copied to clipboard",
                    description: "Generated text has been copied.",
                  });
                }}
              >
                Copy Text
              </button>
              <button 
                className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80"
                onClick={() => setGeneratedContent("")}
              >
                Generate New Text
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Writing Generator</h2>
            <p className="text-sm text-muted-foreground">Upload samples and references to generate content in your style</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <UploadArea
              title="Upload Your Writing Sample"
              description="Upload your original writing for the AI to analyze your style and tone"
              icon="file"
              onUpload={handleSampleUpload}
            />
            
            <UploadArea
              title="Upload Reference Materials"
              description="Upload files or paste links to materials the AI should reference"
              icon="link"
              onUpload={handleReferenceUpload}
              onLinkAdd={handleReferenceLink}
              acceptLinkInput={true}
            />
            
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-md font-medium mb-2 flex items-center">
                <span className="text-primary mr-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                    <path d="M15.4 16.8L13.8 18.4L11.3 16H6C4.9 16 4 15.1 4 14V6C4 4.9 4.9 4 6 4H18C19.1 4 20 4.9 20 6V12.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M11 7H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M19.2 20.8C18.8 21.6 17.7 21.9 16.9 21.5C16.1 21.1 15.8 20 16.2 19.2C16.5 18.5 17.8 16.5 17.8 16.5C17.8 16.5 19.5 20 19.2 20.8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Writing Instructions
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Provide details about what you want the AI to write
              </p>
              <textarea 
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none h-24 bg-card" 
                placeholder="Describe what you want (topic, length, style, etc.)"
                value={chatText.instructions}
                onChange={handleInstructionsChange}
              />
              
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="flex items-center bg-card rounded-full px-3 py-1 text-sm">
                  <span className="mr-2 text-muted-foreground">Length:</span>
                  <select 
                    className="bg-transparent border-0 focus:ring-0 text-sm p-0 pr-5"
                    value={chatText.length}
                    onChange={(e) => handleSelectChange(e, 'length')}
                  >
                    <option>500 words</option>
                    <option>1000 words</option>
                    <option>1500 words</option>
                    <option>Custom</option>
                  </select>
                </div>
                
                <div className="flex items-center bg-card rounded-full px-3 py-1 text-sm">
                  <span className="mr-2 text-muted-foreground">Style:</span>
                  <select 
                    className="bg-transparent border-0 focus:ring-0 text-sm p-0 pr-5"
                    value={chatText.style}
                    onChange={(e) => handleSelectChange(e, 'style')}
                  >
                    <option>Academic</option>
                    <option>Casual</option>
                    <option>Professional</option>
                    <option>Creative</option>
                  </select>
                </div>
                
                <div className="flex items-center bg-card rounded-full px-3 py-1 text-sm">
                  <span className="mr-2 text-muted-foreground">Format:</span>
                  <select 
                    className="bg-transparent border-0 focus:ring-0 text-sm p-0 pr-5"
                    value={chatText.format}
                    onChange={(e) => handleSelectChange(e, 'format')}
                  >
                    <option>Essay</option>
                    <option>Blog post</option>
                    <option>Report</option>
                    <option>Email</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-border">
            <motion.button 
              className={`w-full py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors duration-200 flex items-center justify-center space-x-2 ${
                isGenerating ? 'opacity-75 cursor-not-allowed animate-pulse' : ''
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerateWriting}
              disabled={isGenerating}
            >
              <WandSparkles className="h-5 w-5" />
              <span>{isGenerating ? 'Generating...' : 'Generate Writing'}</span>
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
