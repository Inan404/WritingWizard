import { useState, useEffect } from 'react';
import ResizablePanels from '../common/ResizablePanels';
import TextEditor from '../common/TextEditor';
import StyleOptions from '../common/StyleOptions';
import ProgressBars from '../common/ProgressBars';
import { useWriting, WritingStyle } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Copy, Volume, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function Humanizer() {
  const { humanizerText, setHumanizerText, selectedStyle, scoreMetrics, setScoreMetrics } = useWriting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [entryId, setEntryId] = useState<number | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Save writing entry to database
  const saveEntryMutation = useMutation({
    mutationFn: async (data: { 
      id?: number;
      userId: number; 
      title: string; 
      inputText: string;
      humanizerResult: string | null;
    }) => {
      const endpoint = data.id ? `/api/db/writing-entries/${data.id}` : '/api/db/writing-entries';
      const method = data.id ? 'PATCH' : 'POST';
      const response = await apiRequest(method, endpoint, data);
      return response.json();
    },
    onSuccess: (data) => {
      setEntryId(data.id);
      // Update the writing entries list in dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
    },
    onError: (error) => {
      console.error('Error saving writing entry:', error);
      toast({
        title: "Error saving",
        description: "Could not save your work. Please try again later.",
        variant: "destructive"
      });
    }
  });

  // Humanize text mutation
  const humanizeMutation = useMutation({
    mutationFn: async (data: { text: string; style: WritingStyle }) => {
      const response = await apiRequest('POST', '/api/humanize', data);
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      
      // Update the text in the UI
      setHumanizerText({
        original: humanizerText.original,
        humanized: data.humanized || data.humanizedText
      });
      
      // Update the metrics in the UI
      if (data.metrics) {
        const { correctness, clarity, engagement, delivery } = data.metrics;
        // Update progress bars with metrics from API response
        if (correctness !== undefined && clarity !== undefined && 
            engagement !== undefined && delivery !== undefined) {
          console.log("Updating metrics:", data.metrics);
          // Update the metrics in WritingContext
          setScoreMetrics({
            correctness, 
            clarity, 
            engagement, 
            delivery
          });
        }
      }
      
      // Save to database after successful humanizing
      if (user) {
        saveEntryMutation.mutate({
          id: entryId || undefined,
          userId: user.id,
          title: 'Humanized Text', 
          inputText: humanizerText.original,
          humanizerResult: data.humanized || data.humanizedText
        });
      }
      
      toast({
        title: "Humanizing complete",
        description: "Your AI text has been humanized successfully.",
      });
    },
    onError: (error) => {
      console.error("Humanizing error:", error);
      setIsProcessing(false);
      toast({
        title: "Error humanizing text",
        description: "There was a problem processing your text. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Save the text to database when user types (debounced)
  useEffect(() => {
    if (!user || !humanizerText.original.trim()) return;
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout for 2 seconds after typing stops
    const timeout = setTimeout(() => {
      if (humanizerText.original.trim().length >= 10) {
        saveEntryMutation.mutate({
          id: entryId || undefined,
          userId: user.id,
          title: 'Humanized Text', 
          inputText: humanizerText.original,
          humanizerResult: humanizerText.humanized 
        });
      }
    }, 2000);
    
    setSaveTimeout(timeout);
    
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [humanizerText.original, user]);

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
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <TextEditor
          content={humanizerText.original}
          onChange={handleTextChange}
          isTextArea={true}
          className="text-foreground"
          placeholder="Enter or paste AI-generated text here to humanize..."
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button 
          onClick={handleHumanize}
          disabled={isProcessing}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {isProcessing ? 'Humanizing...' : 'Humanize Text'}
        </button>
      </div>
    </div>
  );

  const RightPanel = (
    <div className="h-full flex flex-col">
      <StyleOptions />
      <ProgressBars />
      
      <div className="flex justify-end mt-2 mb-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          disabled={!humanizerText.humanized}
        >
          <Copy className="h-5 w-5" />
        </motion.button>
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
