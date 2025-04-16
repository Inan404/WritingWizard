import { useState } from 'react';
import ResizablePanels from '../common/ResizablePanels';
import TextEditor from '../common/TextEditor';
import StyleOptions from '../common/StyleOptions';
import ProgressBars from '../common/ProgressBars';
import { useWriting, WritingStyle } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Copy, Volume, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';

export default function Humanizer() {
  const { humanizerText, setHumanizerText, selectedStyle } = useWriting();
  const [isProcessing, setIsProcessing] = useState(false);

  const humanizeMutation = useMutation({
    mutationFn: async (data: { text: string; style: WritingStyle }) => {
      const response = await apiRequest('POST', '/api/humanize', data);
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setHumanizerText({
        original: humanizerText.original,
        humanized: data.humanized
      });
      toast({
        title: "Humanizing complete",
        description: "Your AI text has been humanized successfully.",
      });
    },
    onError: () => {
      setIsProcessing(false);
      toast({
        title: "Error humanizing text",
        description: "There was a problem processing your text. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleTextChange = (text: string) => {
    setHumanizerText({
      ...humanizerText,
      original: text
    });
  };

  const handleHumanize = () => {
    if (humanizerText.original.trim().length < 10) {
      toast({
        title: "Text too short",
        description: "Please enter more text to humanize.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    humanizeMutation.mutate({
      text: humanizerText.original,
      style: selectedStyle
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(humanizerText.humanized);
    toast({
      title: "Copied to clipboard",
      description: "The humanized text has been copied to your clipboard.",
    });
  };

  const LeftPanel = (
    <TextEditor
      content={humanizerText.original}
      onChange={handleTextChange}
      isTextArea={true}
      placeholder="Enter or paste AI-generated text here to humanize..."
    />
  );

  const RightPanel = (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors duration-200 ${
              isProcessing ? 'opacity-75 cursor-not-allowed animate-pulse' : ''
            }`}
            onClick={handleHumanize}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Humanize'}
          </motion.button>
          
          <div className="flex">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
              disabled={!humanizerText.humanized}
            >
              <Copy className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Volume className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
        
        <StyleOptions />
        <ProgressBars />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {humanizerText.humanized ? (
          <div className="text-foreground mb-3">
            {humanizerText.humanized.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-3">{paragraph}</p>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-4">
            <p>Enter AI-generated text on the left and click "Humanize" to see the results here.</p>
          </div>
        )}
      </div>
      
      {humanizerText.humanized && (
        <div className="flex justify-end space-x-2 mt-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-muted"
            onClick={handleCopy}
          >
            <Copy className="h-5 w-5 text-muted-foreground" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-muted"
          >
            <Volume className="h-5 w-5 text-muted-foreground" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-muted"
          >
            <ThumbsUp className="h-5 w-5 text-muted-foreground" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-muted"
          >
            <ThumbsDown className="h-5 w-5 text-muted-foreground" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-muted"
          >
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
          </motion.button>
        </div>
      )}
    </div>
  );

  return (
    <ResizablePanels
      leftPanel={LeftPanel}
      rightPanel={RightPanel}
    />
  );
}
