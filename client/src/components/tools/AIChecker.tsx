import { useState, useEffect } from 'react';
import ResizablePanels from '../common/ResizablePanels';
import TextEditor from '../common/TextEditor';
import Suggestions from '../common/Suggestions';
import StyleOptions from '../common/StyleOptions';
import ProgressBars from '../common/ProgressBars';
import { useWriting } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function AIChecker() {
  const { 
    aiCheckText, 
    setAiCheckText, 
    suggestions, 
    setSuggestions,
    scoreMetrics,
    setScoreMetrics
  } = useWriting();
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
      aiCheckResult: string | null;
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

  // AI check mutation 
  const aiCheckMutation = useMutation({
    mutationFn: async (text: string) => {
      console.log("Sending AI check request");
      const response = await apiRequest('POST', '/api/ai-check', { text });
      const jsonData = await response.json();
      console.log("Received AI check response:", jsonData);
      return jsonData;
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      console.log("AI check data received:", data);
      
      // Set the text content with appropriate fallbacks
      setAiCheckText({
        original: aiCheckText.original,
        modified: data.aiAnalyzed || aiCheckText.original,
        highlights: data.highlights || []
      });
      
      // Update metrics with AI percentage
      if (data.aiPercentage !== undefined) {
        console.log("Updating AI percentage:", data.aiPercentage);
        setScoreMetrics({
          ...scoreMetrics, 
          aiPercentage: data.aiPercentage
        });
      }
      
      // Set suggestions if available
      if (data.suggestions) {
        console.log("Setting suggestions:", data.suggestions.length);
        setSuggestions(data.suggestions);
      }
      
      // Save to database after successful AI check
      if (user) {
        saveEntryMutation.mutate({
          id: entryId || undefined,
          userId: user.id,
          title: 'AI Check Result', 
          inputText: aiCheckText.original,
          aiCheckResult: JSON.stringify({
            highlights: data.highlights || [],
            suggestions: data.suggestions || [],
            aiPercentage: data.aiPercentage || 0
          })
        });
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
  
  // Save the text to database when user types (debounced)
  useEffect(() => {
    if (!user || !aiCheckText.original.trim()) return;
    
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set new timeout for 2 seconds after typing stops
    const timeout = setTimeout(() => {
      if (aiCheckText.original.trim().length >= 10) {
        saveEntryMutation.mutate({
          id: entryId || undefined,
          userId: user.id,
          title: 'AI Check Text', 
          inputText: aiCheckText.original,
          aiCheckResult: aiCheckText.highlights.length > 0 ? JSON.stringify({
            highlights: aiCheckText.highlights,
            suggestions: suggestions,
            aiPercentage: 0 // We don't have this yet
          }) : null
        });
      }
    }, 2000);
    
    setSaveTimeout(timeout);
    
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [aiCheckText.original, user]);

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
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
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
