import { useEffect, useState } from 'react';
import ResizablePanels from '../common/ResizablePanels';
import TextEditor from '../common/TextEditor';
import Suggestions from '../common/Suggestions';
import StyleOptions from '../common/StyleOptions';
import LanguageSelector from '../common/LanguageSelector';
import ProgressBars from '../common/ProgressBars';
import { useWriting, SupportedLanguage } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function GrammarChecker() {
  const { 
    grammarText, 
    setGrammarText, 
    suggestions, 
    setSuggestions,
    selectedLanguage, 
    setSelectedLanguage,
    selectedStyle,
    setSelectedStyle,
    scoreMetrics
  } = useWriting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [entryId, setEntryId] = useState<number | null>(null);

  // Save writing entry to database
  const saveEntryMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      title: string;
      inputText: string;
      grammarResult: string | null;
    }) => {
      const response = await apiRequest('POST', '/api/db/writing-entries', data);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Saved writing entry:', data.entry);
      if (data.entry && data.entry.id) {
        setEntryId(data.entry.id);
      }
      // Invalidate the writing chats query to update the sidebar
      queryClient.invalidateQueries({ queryKey: ['/api/writing-chats'] });
    },
    onError: (error) => {
      console.error('Failed to save writing entry:', error);
      toast({
        title: "Error saving",
        description: "Could not save your work. Please try again later.",
        variant: "destructive"
      });
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
      const response = await apiRequest('POST', '/api/grammar-check', { 
        text,
        language: selectedLanguage 
      });
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
      
      // No database storage for grammar checks per user requirements
      
      toast({
        title: "Grammar check complete",
        description: `We've analyzed your text using ${selectedLanguage} language rules and provided suggestions.`,
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

  // Simplified version - no database storage for grammar checks
  
  // Just use a temporary ID if needed for the UI state
  useEffect(() => {
    // Just set a fake ID for UI state purposes if needed
    if (!entryId) {
      setEntryId(-1); // Use a negative ID to indicate it's not a real database ID
    }
  }, [entryId]);
  
  // Save changes to database with debounce
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const handleTextChange = (text: string) => {
    setGrammarText({
      ...grammarText,
      original: text
    });
    
    // No database saving needed
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
      {/* Style options - exactly matching the screenshot */}
      <div className="mb-6 space-y-2">
        {/* First row of buttons (Standard / Academic) */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedStyle === "standard" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
            }`}
            onClick={() => setSelectedStyle("standard")}
          >
            Standard
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedStyle === "academic" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
            }`}
            onClick={() => setSelectedStyle("academic")}
          >
            Academic
          </button>
        </div>
        
        {/* Second row of buttons (Fluency / Custom) */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedStyle === "fluency" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
            }`}
            onClick={() => setSelectedStyle("fluency")}
          >
            Fluency
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedStyle === "custom" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-200"
            }`}
            onClick={() => setSelectedStyle("custom")}
          >
            Custom
          </button>
        </div>
      </div>
      
      {/* Language Selector Dropdown */}
      <div className="mb-6">
        <select 
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700"
          value={selectedLanguage}
          onChange={(e) => {
            setSelectedLanguage(e.target.value as SupportedLanguage);
            // Reset suggestions when language changes
            setSuggestions([]);
          }}
        >
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="fr-FR">French</option>
          <option value="de-DE">German</option>
          <option value="es-ES">Spanish</option>
          <option value="it-IT">Italian</option>
          <option value="nl-NL">Dutch</option>
          <option value="pt-PT">Portuguese</option>
          <option value="ru-RU">Russian</option>
          <option value="zh-CN">Chinese</option>
          <option value="pl-PL">Polish</option>
        </select>
      </div>
      
      {/* Progress Bars for metrics - Using scoreMetrics from useWriting */}
      <div className="mb-6 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Correctness</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full" style={{ width: `${scoreMetrics?.correctness || 0}%` }}></div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Clarity</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: `${scoreMetrics?.clarity || 0}%` }}></div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Engagement</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${scoreMetrics?.engagement || 0}%` }}></div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Delivery</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="bg-yellow-500 h-full" style={{ width: `${scoreMetrics?.delivery || 0}%` }}></div>
          </div>
        </div>
      </div>
      
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
