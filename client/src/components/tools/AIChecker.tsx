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
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

type AISuggestion = {
  id: string;
  type: "grammar" | "suggestion" | "ai" | "error";
  text: string;
  replacement: string;
  description: string;
};

type AIHighlight = {
  id: string;
  type: string;
  start: number;
  end: number;
  message?: string;
};

export default function AIChecker() {
  const { 
    aiCheckText, 
    setAiCheckText, 
    suggestions: contextSuggestions, 
    setSuggestions,
    scoreMetrics,
    setScoreMetrics
  } = useWriting();
  
  // Enhanced local state for AI analysis
  const [analysisResult, setAnalysisResult] = useState<{
    aiPercentage: number;
    highlights: AIHighlight[];
    suggestions: AISuggestion[];
    isAnalyzed: boolean;
  }>({
    aiPercentage: 0,
    highlights: [],
    suggestions: [],
    isAnalyzed: false
  });
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      console.log("Entry saved successfully:", data);
      setEntryId(data.entry.id);
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
          aiCheckResult: analysisResult.isAnalyzed ? JSON.stringify({
            highlights: analysisResult.highlights,
            suggestions: analysisResult.suggestions,
            aiPercentage: analysisResult.aiPercentage
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
  }, [aiCheckText.original, user, analysisResult]);

  const handleTextChange = (text: string) => {
    setAiCheckText({
      ...aiCheckText,
      original: text
    });
    
    // Reset analysis when text changes substantially
    if (text.length < aiCheckText.original.length * 0.8 || text.length > aiCheckText.original.length * 1.2) {
      setAnalysisResult({
        ...analysisResult,
        isAnalyzed: false
      });
    }
  };

  const handleAICheck = async () => {
    if (aiCheckText.original.trim().length < 10) {
      toast({
        title: "Text too short",
        description: "Please enter more text to analyze for AI content.",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    // Reset previous analysis
    setAnalysisResult({
      aiPercentage: 0,
      highlights: [],
      suggestions: [],
      isAnalyzed: false
    });
    
    // Clear existing suggestions in context
    setSuggestions([]);
    
    // Add visual feedback
    toast({
      title: "Analyzing content",
      description: "Checking your text for AI patterns...",
    });
    
    try {
      console.log("Sending AI check request for text:", aiCheckText.original.substring(0, 50) + "...");
      
      const response = await fetch('/api/ai-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: aiCheckText.original }),
      });
      
      console.log("AI check API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("AI check API data received:", data);
      
      // Handle successful analysis
      if (data) {
        // Map API data to our expected format for highlights
        const mappedHighlights = data.highlights?.map((highlight: any) => ({
          id: highlight.id || `highlight-${Math.random().toString(36).substring(2, 9)}`,
          type: highlight.type || "ai",
          start: highlight.start || 0,
          end: highlight.end || 0,
          message: highlight.message || "AI-generated content detected"
        })) || [];
        
        // Map API data to our expected format for suggestions
        const mappedSuggestions = data.suggestions?.map((suggestion: any) => ({
          id: suggestion.id || `suggestion-${Math.random().toString(36).substring(2, 9)}`,
          type: (suggestion.type || "ai") as "grammar" | "suggestion" | "ai" | "error",
          text: suggestion.originalText || suggestion.text || "",
          replacement: suggestion.suggestedText || suggestion.replacement || "",
          description: suggestion.description || "Improve this AI-generated text for a more natural sound"
        })) || [];
        
        console.log("Mapped suggestions:", mappedSuggestions);
        console.log("Mapped highlights:", mappedHighlights);
        
        // Update metrics
        const metrics = {
          correctness: data.metrics?.correctness || 75,
          clarity: data.metrics?.clarity || 70,
          engagement: data.metrics?.engagement || 60,
          delivery: data.metrics?.delivery || 65,
          aiPercentage: data.aiPercentage || 0
        };
        
        // Set context metrics
        setScoreMetrics({
          ...metrics,
          aiPercentage: data.aiPercentage || 0
        });
        
        // Set the analysis result
        setAnalysisResult({
          aiPercentage: data.aiPercentage || 0,
          highlights: mappedHighlights,
          suggestions: mappedSuggestions,
          isAnalyzed: true
        });
        
        // Update context suggestions
        setSuggestions(mappedSuggestions);
        
        // Update highlights in the editor
        setAiCheckText({
          original: aiCheckText.original,
          modified: data.aiAnalyzed || aiCheckText.original,
          highlights: mappedHighlights
        });
        
        // Save analysis result to database
        if (user) {
          saveEntryMutation.mutate({
            id: entryId || undefined,
            userId: user.id,
            title: 'AI Check Result',
            inputText: aiCheckText.original,
            aiCheckResult: JSON.stringify({
              highlights: mappedHighlights,
              suggestions: mappedSuggestions,
              aiPercentage: data.aiPercentage || 0
            })
          });
        }
        
        toast({
          title: "Analysis complete",
          description: `Your text is approximately ${data.aiPercentage || 0}% AI-generated.`,
        });
      } else {
        throw new Error("No data received from API");
      }
    } catch (err: any) {
      console.error("AI check API error:", err);
      setError(err.message || "Failed to analyze text");
      
      toast({
        title: "Error analyzing content",
        description: err.message || "There was a problem processing your text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptSuggestion = (id: string) => {
    const suggestion = analysisResult.suggestions.find((s) => s.id === id);
    if (!suggestion) return;
    
    console.log("Accepting suggestion:", suggestion);

    // Apply the suggestion to the text
    const updatedText = aiCheckText.original.replace(suggestion.text, suggestion.replacement);
    
    // Update text in editor
    setAiCheckText({
      ...aiCheckText,
      original: updatedText
    });
    
    // Remove the suggestion from both states
    const filteredSuggestions = analysisResult.suggestions.filter(s => s.id !== id);
    setAnalysisResult({
      ...analysisResult,
      suggestions: filteredSuggestions
    });
    
    setSuggestions(contextSuggestions.filter((s) => s.id !== id));
    
    toast({
      title: "Suggestion applied",
      description: "Text has been updated with the suggested improvement."
    });
  };

  const handleDismissSuggestion = (id: string) => {
    // Remove the suggestion from both states
    const filteredSuggestions = analysisResult.suggestions.filter(s => s.id !== id);
    setAnalysisResult({
      ...analysisResult,
      suggestions: filteredSuggestions
    });
    
    setSuggestions(contextSuggestions.filter((s) => s.id !== id));
  };

  // Render results based on analysis state
  const renderResults = () => {
    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p>Analyzing AI content patterns...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-md">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-medium">Analysis Error</h3>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-sm mt-2">Please try again or contact support if the issue persists.</p>
        </div>
      );
    }
    
    if (analysisResult.isAnalyzed) {
      return (
        <div className="space-y-4">
          {/* AI Score Summary */}
          <div className={`p-4 border rounded-md ${analysisResult.aiPercentage > 70 ? 'border-amber-500/70 bg-amber-500/5' : 'border-border'}`}>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              AI Analysis Complete
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {analysisResult.aiPercentage > 70 
                ? "This text has strong indicators of AI generation. Consider humanizing it further."
                : analysisResult.aiPercentage > 40
                ? "This text contains some AI patterns. Adding personal perspectives would help."
                : "This text appears to be mostly human-written. Nice work!"}
            </p>
            
            {/* AI percentage bar */}
            <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden mt-1 mb-3">
              <div 
                className="absolute top-0 left-0 h-full bg-primary rounded-full" 
                style={{ width: `${analysisResult.aiPercentage}%` }} 
              />
            </div>
            
            {analysisResult.highlights.length > 0 && (
              <div className="mt-2">
                <h4 className="text-xs uppercase font-semibold text-muted-foreground tracking-wide mb-1">
                  AI Patterns Detected
                </h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  {analysisResult.highlights.slice(0, 3).map((highlight) => (
                    <li key={highlight.id} className="text-sm">
                      {highlight.message || "AI pattern detected"}
                    </li>
                  ))}
                  {analysisResult.highlights.length > 3 && (
                    <li className="text-sm font-medium">
                      +{analysisResult.highlights.length - 3} more patterns
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
          
          {/* Suggestions */}
          {analysisResult.suggestions.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-3">Recommended Improvements</h4>
              <Suggestions 
                onAccept={handleAcceptSuggestion}
                onDismiss={handleDismissSuggestion}
                type="ai"
                suggestions={analysisResult.suggestions}
              />
            </div>
          ) : (
            analysisResult.aiPercentage > 40 && (
              <div className="p-4 border rounded-md mt-4">
                <h4 className="text-sm font-medium mb-2">Humanizing Tips</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-2">
                  <li>Add personal anecdotes or experiences related to the topic</li>
                  <li>Use more varied sentence structures and informal language</li>
                  <li>Include some humor or personality where appropriate</li>
                  <li>Reduce overuse of academic or formal vocabulary</li>
                </ul>
              </div>
            )
          )}
        </div>
      );
    }
    
    // Default state when no analysis has been run
    return (
      <div className="p-4 border rounded-md border-border">
        <h3 className="font-medium mb-2">AI Content Detector</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your text on the left and click "Check for AI Content" to analyze it for AI-generated patterns.
        </p>
        <div className="text-sm space-y-2">
          <p className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-500 p-1 rounded">AI%</span>
            <span>Measures how likely your text was AI-generated</span>
          </p>
          <p className="flex items-center gap-2">
            <span className="bg-red-500/20 text-red-500 p-1 rounded">Fix</span>
            <span>Suggestions to improve and humanize your content</span>
          </p>
        </div>
      </div>
    );
  };

  const LeftPanel = (
    <div className="flex flex-col h-full">
      <TextEditor
        content={aiCheckText.original}
        onChange={handleTextChange}
        highlightText={analysisResult.isAnalyzed}
        className="text-foreground flex-1"
        placeholder="Enter or paste your text here to check for AI content..."
      />
      
      <div className="mt-4 flex justify-end">
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
          onClick={handleAICheck}
          disabled={isProcessing || aiCheckText.original.trim().length < 10}
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
      <ProgressBars 
        showAI={true}
      />
      <div className="flex-1 overflow-y-auto mt-4 px-2">
        {renderResults()}
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
