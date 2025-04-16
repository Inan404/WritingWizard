import { useState } from 'react';
import ResizablePanels from '../common/ResizablePanels';
import TextEditor from '../common/TextEditor';
import Suggestions from '../common/Suggestions';
import StyleOptions from '../common/StyleOptions';
import ProgressBars from '../common/ProgressBars';
import { useWriting } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export default function AIChecker() {
  const { aiCheckText, setAiCheckText, suggestions, setSuggestions } = useWriting();
  const [isProcessing, setIsProcessing] = useState(false);

  const aiCheckMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/ai-check', { text });
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setAiCheckText({
        original: aiCheckText.original,
        modified: data.aiAnalyzed || aiCheckText.original,
        highlights: data.highlights || []
      });
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
      toast({
        title: "AI check complete",
        description: "We've analyzed your text for AI-generated content.",
      });
    },
    onError: () => {
      setIsProcessing(false);
      toast({
        title: "Error checking for AI content",
        description: "There was a problem processing your text. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleTextChange = (text: string) => {
    setAiCheckText({
      ...aiCheckText,
      original: text
    });
  };

  const handleAICheck = () => {
    if (aiCheckText.original.trim().length < 10) {
      toast({
        title: "Text too short",
        description: "Please enter more text to analyze for AI content.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    aiCheckMutation.mutate(aiCheckText.original);
  };

  const handleAcceptSuggestion = (id: string) => {
    const suggestion = suggestions.find(s => s.id === id);
    if (!suggestion) return;

    // Apply the suggestion to the text
    const updatedText = aiCheckText.original.replace(suggestion.text, suggestion.replacement);
    setAiCheckText({
      ...aiCheckText,
      original: updatedText
    });

    // Remove the suggestion from the list
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const LeftPanel = (
    <div className="flex flex-col h-full">
      <TextEditor
        content={aiCheckText.original}
        onChange={handleTextChange}
        highlightText={true}
        className="text-foreground flex-1"
        placeholder="Enter or paste your text here to check for AI content..."
      />
      
      <div className="mt-4 flex justify-end">
        <button
          className={`px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors duration-200 ${
            isProcessing ? 'opacity-75 cursor-not-allowed animate-pulse' : ''
          }`}
          onClick={handleAICheck}
          disabled={isProcessing}
        >
          {isProcessing ? 'Analyzing...' : 'Check for AI Content'}
        </button>
      </div>
    </div>
  );

  const RightPanel = (
    <div className="h-full flex flex-col">
      <StyleOptions />
      <ProgressBars showAI={true} />
      <div className="flex-1 overflow-y-auto">
        <Suggestions 
          onAccept={handleAcceptSuggestion} 
          onDismiss={handleDismissSuggestion}
          type="ai"
        />
      </div>
    </div>
  );

  return (
    <ResizablePanels
      leftPanel={LeftPanel}
      rightPanel={RightPanel}
    />
  );
}
