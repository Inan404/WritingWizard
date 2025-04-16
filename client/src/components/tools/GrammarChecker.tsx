import { useEffect, useState } from 'react';
import ResizablePanels from '../common/ResizablePanels';
import TextEditor from '../common/TextEditor';
import Suggestions from '../common/Suggestions';
import StyleOptions from '../common/StyleOptions';
import ProgressBars from '../common/ProgressBars';
import { useWriting } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export default function GrammarChecker() {
  const { grammarText, setGrammarText, suggestions, setSuggestions } = useWriting();
  const [isProcessing, setIsProcessing] = useState(false);

  const grammarCheckMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/grammar-check', { text });
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      setGrammarText({
        original: grammarText.original,
        modified: data.corrected || grammarText.original,
        highlights: data.highlights || []
      });
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
      toast({
        title: "Grammar check complete",
        description: "We've analyzed your text and provided suggestions.",
      });
    },
    onError: () => {
      setIsProcessing(false);
      toast({
        title: "Error checking grammar",
        description: "There was a problem processing your text. Please try again.",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    // Check grammar when text changes (with debounce)
    const timer = setTimeout(() => {
      if (grammarText.original.trim().length > 10) {
        setIsProcessing(true);
        grammarCheckMutation.mutate(grammarText.original);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [grammarText.original]);

  const handleTextChange = (text: string) => {
    setGrammarText({
      ...grammarText,
      original: text
    });
  };

  const handleAcceptSuggestion = (id: string) => {
    const suggestion = suggestions.find(s => s.id === id);
    if (!suggestion) return;

    // Apply the suggestion to the text
    const updatedText = grammarText.original.replace(suggestion.text, suggestion.replacement);
    setGrammarText({
      ...grammarText,
      original: updatedText
    });

    // Remove the suggestion from the list
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  const LeftPanel = (
    <TextEditor
      content={grammarText.original}
      onChange={handleTextChange}
      highlightText={true}
      className="text-foreground"
      placeholder="Enter or paste your text here to check grammar..."
    />
  );

  const RightPanel = (
    <div className="h-full flex flex-col">
      <StyleOptions showDocTypes={true} />
      <ProgressBars />
      <div className="flex-1 overflow-y-auto">
        <Suggestions 
          onAccept={handleAcceptSuggestion} 
          onDismiss={handleDismissSuggestion}
          type="grammar"
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
