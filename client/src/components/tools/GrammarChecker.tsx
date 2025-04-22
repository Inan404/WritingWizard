import { useEffect, useState } from 'react';
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

export default function GrammarChecker() {
  const { grammarText, setGrammarText, suggestions, setSuggestions } = useWriting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [entryId, setEntryId] = useState<number | null>(null);

  // Save writing entry to database
  const saveEntryMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      inputText: string;
      grammarResult: string | null;
    }) => {
      const response = await apiRequest('POST', '/api/db/writing-entries', data);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Saved writing entry:', data.entry);
      setEntryId(data.entry.id);
      // Invalidate the writing chats query to update the sidebar
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
    },
    onError: (error) => {
      console.error('Failed to save writing entry:', error);
    }
  });
  
  // Update writing entry
  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: {
      id: number;
      data: {
        title?: string;
        inputText?: string;
        grammarResult?: string | null;
      }
    }) => {
      const response = await apiRequest('PATCH', `/api/db/writing-entries/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Updated writing entry:', data.entry);
      // Invalidate the writing chats query to update the sidebar
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
    },
    onError: (error) => {
      console.error('Failed to update writing entry:', error);
    }
  });

  const grammarCheckMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/grammar-check', { text });
      return response.json();
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      const correctedText = data.corrected || grammarText.original;
      
      setGrammarText({
        original: grammarText.original,
        modified: correctedText,
        highlights: data.highlights || []
      });
      
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
      
      // Save to database if user is authenticated
      if (user) {
        const title = grammarText.original.slice(0, 30) + '...';
        const result = JSON.stringify({
          corrected: correctedText,
          highlights: data.highlights || [],
          suggestions: data.suggestions || []
        });
        
        // If we already have an entry ID, update it
        if (entryId) {
          updateEntryMutation.mutate({
            id: entryId,
            data: {
              grammarResult: result
            }
          });
        } else {
          // Create a new entry
          saveEntryMutation.mutate({
            title,
            inputText: grammarText.original,
            grammarResult: result
          });
        }
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

  // Remove auto-checking to prevent random popups
  const checkGrammar = () => {
    if (grammarText.original.trim().length > 10) {
      setIsProcessing(true);
      grammarCheckMutation.mutate(grammarText.original);
    } else {
      toast({
        title: "Text too short",
        description: "Please enter at least 10 characters to check grammar.",
        variant: "destructive"
      });
    }
  };

  // Create a new writing entry when the component loads
  useEffect(() => {
    if (user && !entryId && grammarText.original.trim().length > 0) {
      // Save initial text to database to create an entry
      const title = grammarText.original.slice(0, 30) + '...';
      saveEntryMutation.mutate({
        title,
        inputText: grammarText.original,
        grammarResult: null
      });
    }
  }, [user]);
  
  // Save changes to database with debounce
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const handleTextChange = (text: string) => {
    setGrammarText({
      ...grammarText,
      original: text
    });
    
    // Save to database with debounce
    if (user && entryId) {
      // Clear previous timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      
      // Set new timeout
      const timeout = setTimeout(() => {
        updateEntryMutation.mutate({
          id: entryId,
          data: {
            title: text.slice(0, 30) + '...',
            inputText: text
          }
        });
      }, 2000); // 2 second debounce
      
      setSaveTimeout(timeout);
    }
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
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <TextEditor
          content={grammarText.original}
          onChange={handleTextChange}
          highlightText={true}
          className="text-foreground"
          placeholder="Enter or paste your text here to check grammar..."
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button 
          onClick={checkGrammar}
          disabled={isProcessing}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          {isProcessing ? 'Checking...' : 'Check Grammar'}
        </button>
      </div>
    </div>
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
