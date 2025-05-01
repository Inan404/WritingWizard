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

export default function Paraphraser() {
  const { paraphraseText, setParaphraseText, selectedStyle, setScoreMetrics } = useWriting();
  const [isProcessing, setIsProcessing] = useState(false);

  // No database storage needed for paraphraser per user request

  // Paraphrase text mutation
  const paraphraseMutation = useMutation({
    mutationFn: async (data: { text: string; style: WritingStyle }) => {
      console.log("Sending paraphrase request with style:", data.style);
      const response = await apiRequest('POST', '/api/paraphrase', data);
      const jsonData = await response.json();
      console.log("Received paraphrase response:", jsonData);
      return jsonData;
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      // Handle both possible response formats (paraphrased or paraphrasedText)
      const paraphrasedContent = data.paraphrased || data.paraphrasedText;
      console.log("Setting paraphrased content:", paraphrasedContent);
      
      if (paraphrasedContent) {
        setParaphraseText({
          original: paraphraseText.original,
          paraphrased: paraphrasedContent
        });
      } else {
        console.error("No paraphrased content found in response:", data);
      }
      
      // Update metrics if available
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
      
      // No database storage needed for paraphraser per user request
      
      toast({
        title: "Paraphrasing complete",
        description: "Your text has been paraphrased successfully.",
      });
    },
    onError: (error) => {
      console.error("Paraphrase error:", error);
      setIsProcessing(false);
      toast({
        title: "Error paraphrasing text",
        description: "There was a problem processing your text. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // No database storage effects needed per user request

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
