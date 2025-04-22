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

export default function Paraphraser() {
  const { paraphraseText, setParaphraseText, selectedStyle } = useWriting();
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
      paraphraseResult: string | null;
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

  // Paraphrase text mutation
  const paraphraseMutation = useMutation({
    mutationFn: async (data: { text: string; style: WritingStyle }) => {
      const response = await apiRequest('POST', '/api/paraphrase', data);
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setParaphraseText({
        original: paraphraseText.original,
        paraphrased: data.paraphrased
      });
      
      // Save to database after successful paraphrasing
      if (user) {
        saveEntryMutation.mutate({
          id: entryId || undefined,
          userId: user.id,
          title: 'Paraphrased Text', 
          inputText: paraphraseText.original,
          paraphraseResult: data.paraphrased
        });
      }
      
      toast({
        title: "Paraphrasing complete",
        description: "Your text has been paraphrased successfully.",
      });
    },
    onError: () => {
      setIsProcessing(false);
      toast({
        title: "Error paraphrasing text",
        description: "There was a problem processing your text. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Save the text to database when user types (debounced)
  useEffect(() => {
    if (!user || !paraphraseText.original.trim()) return;
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout for 2 seconds after typing stops
    const timeout = setTimeout(() => {
      if (paraphraseText.original.trim().length >= 10) {
        saveEntryMutation.mutate({
          id: entryId || undefined,
          userId: user.id,
          title: 'Paraphrased Text', 
          inputText: paraphraseText.original,
          paraphraseResult: paraphraseText.paraphrased 
        });
      }
    }, 2000);
    
    setSaveTimeout(timeout);
    
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [paraphraseText.original, user]);

  const handleTextChange = (text: string) => {
    setParaphraseText({
      ...paraphraseText,
      original: text
    });
  };

  const handleParaphrase = () => {
    if (paraphraseText.original.trim().length < 10) {
      toast({
        title: "Text too short",
        description: "Please enter more text to paraphrase.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    paraphraseMutation.mutate({
      text: paraphraseText.original,
      style: selectedStyle
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(paraphraseText.paraphrased);
    toast({
      title: "Copied to clipboard",
      description: "The paraphrased text has been copied to your clipboard.",
    });
  };

  const LeftPanel = (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <TextEditor
          content={paraphraseText.original}
          onChange={handleTextChange}
          isTextArea={true}
          className="text-foreground"
          placeholder="Enter or paste your text here to paraphrase..."
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button 
          onClick={handleParaphrase}
          disabled={isProcessing}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {isProcessing ? 'Paraphrasing...' : 'Paraphrase Text'}
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
          disabled={!paraphraseText.paraphrased}
        >
          <Copy className="h-5 w-5" />
        </motion.button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {paraphraseText.paraphrased ? (
          <div className="text-foreground mb-3">
            {paraphraseText.paraphrased.split('\n').map((paragraph, i) => (
              <p key={i} className="mb-3">{paragraph}</p>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-4">
            <p>Enter text on the left and click "Paraphrase" to see the results here.</p>
          </div>
        )}
      </div>
      
      {paraphraseText.paraphrased && (
        <div className="flex justify-end space-x-2 mt-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-muted"
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
