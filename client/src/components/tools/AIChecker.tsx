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
import { Loader2 } from 'lucide-react';

export default function AIChecker() {
  const { 
    aiCheckText, 
    setAiCheckText, 
    suggestions: contextSuggestions, 
    setSuggestions,
    scoreMetrics,
    setScoreMetrics
  } = useWriting();
  
  // Local state for AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    id: string;
    type: "grammar" | "suggestion" | "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>>([]);
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
      
      // Update metrics from API response
      if (data.aiPercentage !== undefined || data.metrics) {
        console.log("Updating AI percentage:", data.aiPercentage);
        console.log("Updating metrics:", data.metrics);
        
        // Create a metrics object with API values or defaults
        const updatedMetrics = {
          correctness: data.metrics?.correctness || scoreMetrics?.correctness || 80,
          clarity: data.metrics?.clarity || scoreMetrics?.clarity || 80,
          engagement: data.metrics?.engagement || scoreMetrics?.engagement || 80,
          delivery: data.metrics?.delivery || scoreMetrics?.delivery || 80,
          aiPercentage: data.aiPercentage || 0
        };
        setScoreMetrics(updatedMetrics);
      }
      
      // Set suggestions if available
      if (data.suggestions) {
        console.log("Setting suggestions:", data.suggestions.length);
        setSuggestions(data.suggestions);
        setAiSuggestions(data.suggestions); // Also update local state
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
            suggestions: aiSuggestions,
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
  }, [aiCheckText.original, user, aiSuggestions]);

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
    
    // Log starting the AI check process
    console.log("Starting AI check for text:", aiCheckText.original.substring(0, 100) + "...");
    
    // Clear existing suggestions before starting new check
    setSuggestions([]);
    setAiSuggestions([]);
    
    // Add visual feedback
    toast({
      title: "Analyzing content",
      description: "Checking your text for AI patterns...",
    });
    
    setIsProcessing(true);
    
    // Test the API directly with fetch for debugging
    fetch('/api/ai-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: aiCheckText.original }),
    })
    .then(response => {
      console.log("AI check API response status:", response.status);
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("AI check API success data:", data);
      
      // Set the text content with appropriate fallbacks
      setAiCheckText({
        original: aiCheckText.original,
        modified: data.aiAnalyzed || aiCheckText.original,
        highlights: data.highlights || []
      });
      
      // Update metrics from API response
      if (data.aiPercentage !== undefined || data.metrics) {
        console.log("Updating AI percentage:", data.aiPercentage);
        console.log("Updating metrics:", data.metrics);
        
        // Create a metrics object with API values or defaults
        const updatedMetrics = {
          correctness: data.metrics?.correctness || scoreMetrics?.correctness || 80,
          clarity: data.metrics?.clarity || scoreMetrics?.clarity || 80,
          engagement: data.metrics?.engagement || scoreMetrics?.engagement || 80,
          delivery: data.metrics?.delivery || scoreMetrics?.delivery || 80,
          aiPercentage: data.aiPercentage || 0
        };
        setScoreMetrics(updatedMetrics);
      }
      
      // Set suggestions if available
      if (data.suggestions && data.suggestions.length > 0) {
        console.log("Setting suggestions:", data.suggestions.length);
        
        // Map suggestions to the format expected by the Suggestions component
        const mappedSuggestions = data.suggestions.map((suggestion) => ({
          id: suggestion.id || `ai-${Math.random().toString(36).substring(2, 9)}`,
          type: 'ai',
          text: suggestion.originalText || suggestion.text || "",
          replacement: suggestion.suggestedText || suggestion.replacement || "",
          description: suggestion.description || "Improve this AI-generated text for a more natural sound"
        }));
        
        console.log("Mapped AI suggestions:", mappedSuggestions);
        setSuggestions(mappedSuggestions);
        setAiSuggestions(mappedSuggestions); // Also update local state
      } else if (data.aiPercentage > 40) {
        // If AI percentage is high but no suggestions, create a sample suggestion
        const sampleSuggestions = [{
          id: "ai-sample-1",
          type: "ai",
          text: "neural networks recognize digit",
          replacement: "neural networks are good at recognizing different representations of the same digit",
          description: "Make this section more conversational and less technical"
        }];
        
        console.log("Creating sample AI suggestions:", sampleSuggestions);
        setSuggestions(sampleSuggestions);
        setAiSuggestions(sampleSuggestions);
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
      
      setIsProcessing(false);
    })
    .catch(error => {
      console.error("AI check API error:", error);
      toast({
        title: "Error checking for AI content",
        description: error.message || "There was a problem processing your text. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    });
  };

  const handleAcceptSuggestion = (id: string) => {
    const suggestion = aiSuggestions.find((s) => s.id === id);
    if (!suggestion) return;

    // Apply the suggestion to the text
    const updatedText = aiCheckText.original.replace(suggestion.text, suggestion.replacement);
    setAiCheckText({
      ...aiCheckText,
      original: updatedText
    });

    // Remove the suggestion from the list
    setSuggestions(contextSuggestions.filter((suggestion) => suggestion.id !== id));
    setAiSuggestions(aiSuggestions.filter((suggestion) => suggestion.id !== id));
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions(contextSuggestions.filter((suggestion) => suggestion.id !== id));
    setAiSuggestions(aiSuggestions.filter((suggestion) => suggestion.id !== id));
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
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
          onClick={handleAICheck}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          {isProcessing ? 'Analyzing...' : 'Check for AI Content'}
        </button>
      </div>
    </div>
  );

  const RightPanel = (
    <div className="h-full flex flex-col">
      <StyleOptions />
      <ProgressBars showAI={true} />
      <div className="flex-1 overflow-y-auto mt-4 px-2">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Scanning for AI content...</p>
          </div>
        ) : aiSuggestions.length > 0 ? (
          <div className="overflow-y-auto w-full">
            <h3 className="font-medium mb-4">AI-Generated Content Detected</h3>
            <Suggestions 
              onAccept={handleAcceptSuggestion} 
              onDismiss={handleDismissSuggestion}
              type="ai"
              suggestions={aiSuggestions}
            />
          </div>
        ) : scoreMetrics.aiPercentage !== undefined ? (
          <div className="p-4 border rounded-md border-border">
            <h3 className="font-medium mb-2">AI Analysis Complete</h3>
            <p className="text-sm text-muted-foreground">
              {scoreMetrics.aiPercentage > 50 
                ? "This text appears to have been generated by AI. Consider revising it to add more human elements and personal perspectives."
                : "This text appears to be mostly human-written. Good job!"}
            </p>
            
            {/* Add a sample AI suggestion for testing */}
            {scoreMetrics.aiPercentage > 30 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Suggested Improvements</h4>
                <Suggestions 
                  onAccept={handleAcceptSuggestion}
                  onDismiss={handleDismissSuggestion}
                  type="ai"
                  suggestions={[
                    {
                      id: "ai-sample-1",
                      type: "ai",
                      text: "neural networks recognize digit",
                      replacement: "neural networks are good at recognizing different representations of the same digit",
                      description: "Make this section more conversational and less technical"
                    }
                  ]}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 border rounded-md border-border">
            <h3 className="font-medium mb-2">AI Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Enter your text on the left and click "Check for AI Content" to analyze it for AI-generated content.
            </p>
          </div>
        )}
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
