import { useEffect, useState } from 'react';
import ResizablePanels from '../common/ResizablePanels';
import TextEditor from '../common/TextEditor';
import Suggestions from '../common/Suggestions';
import { useWriting, SupportedLanguage } from '@/context/WritingContext';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function GrammarChecker() {
  const { 
    grammarText, 
    setGrammarText, 
    suggestions, 
    setSuggestions,
    selectedLanguage, 
    setSelectedLanguage
  } = useWriting();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Grammar check request
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
      {/* Just a single language selector dropdown */}
      <div className="mb-6">
        <label htmlFor="language-select" className="block text-sm font-medium text-gray-400 mb-2">
          Select Language
        </label>
        <select 
          id="language-select"
          className="w-full px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700"
          value={selectedLanguage}
          onChange={(e) => {
            const newLanguage = e.target.value as SupportedLanguage;
            setSelectedLanguage(newLanguage);
            setSuggestions([]); // Reset suggestions when language changes
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
      
      {/* Suggestions section */}
      <div className="flex-1 overflow-y-auto mt-4">
        <h3 className="text-lg font-medium text-gray-200 mb-3">Suggestions</h3>
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
