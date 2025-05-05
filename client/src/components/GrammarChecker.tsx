/**
 * GrammarChecker.tsx
 * 
 * This component provides grammar checking functionality using the LanguageTool API integration.
 * It identifies grammar and spelling errors and provides suggestions for corrections.
 * 
 * Features:
 * - Real-time grammar and spelling error detection
 * - Inline error corrections with suggestions
 * - Progressive correction (rechecks text after each correction)
 * - Support for multiple languages
 * 
 * Note: The component makes API calls to the backend which then uses the LanguageTool API.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, CheckSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// Type definitions
interface GrammarError {
  id: string;
  type: string;
  errorText: string;
  replacementText: string;
  description: string;
  position?: {
    start: number;
    end: number;
  };
}

interface GrammarResult {
  errors?: GrammarError[];
  metrics?: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

// Available language options
const languageOptions = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'nl-NL', label: 'Dutch' },
];

export function GrammarChecker() {
  // State for text input and results
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [appliedCorrections, setAppliedCorrections] = useState<Set<string>>(new Set());
  
  // UI state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Toast hook
  const { toast } = useToast();
  
  // State for storing results and loading state
  const [result, setResult] = useState<any>(null);
  const [isPending, setIsPending] = useState(false);
  
  // Function to handle grammar check
  const handleCheckGrammar = () => {
    if (!text.trim()) {
      toast({
        title: 'Empty text',
        description: 'Please enter some text to check.',
        variant: 'destructive'
      });
      return;
    }
    
    // Reset any previously applied corrections
    setAppliedCorrections(new Set());
    
    // Use our helper function to check grammar
    checkGrammarWithText(text);
  };
  
  // Function to apply a grammar correction
  const applyCorrection = (error: GrammarError) => {
    if (error.errorText && error.replacementText) {
      // Replace the text
      const newText = text.replace(error.errorText, error.replacementText);
      setText(newText);
      
      // Add to applied corrections to prevent showing again
      setAppliedCorrections(prev => {
        const updated = new Set(prev);
        updated.add(error.id);
        return updated;
      });
      
      toast({
        title: 'Correction applied',
        description: `"${error.errorText}" replaced with "${error.replacementText}"`
      });
      
      // Re-run grammar check with the updated text
      setTimeout(() => {
        checkGrammarWithText(newText);
      }, 500); // Small delay to ensure UI updates first
    }
  };
  
  // Function to ignore a grammar correction
  const ignoreCorrection = (errorId: string) => {
    setAppliedCorrections(prev => {
      const updated = new Set(prev);
      updated.add(errorId);
      return updated;
    });
    
    toast({
      title: 'Suggestion ignored',
      description: 'This suggestion has been hidden'
    });
  };
  
  // Function to fix all grammar issues at once
  const fixAllCorrections = () => {
    if (!result || !result.suggestions || result.suggestions.length === 0) {
      return;
    }
    
    let newText = text;
    const updatedApplied = new Set(appliedCorrections);
    
    // Apply all corrections that haven't already been applied
    result.suggestions
      .filter((suggestion: any) => !appliedCorrections.has(suggestion.id))
      .forEach((suggestion: any) => {
        newText = newText.replace(suggestion.text, suggestion.replacement);
        updatedApplied.add(suggestion.id);
      });
      
    setText(newText);
    setAppliedCorrections(updatedApplied);
    
    toast({
      title: 'All corrections applied',
      description: `Applied ${result.suggestions.filter((s: any) => !appliedCorrections.has(s.id)).length} corrections`
    });
    
    // Re-run grammar check with all corrections applied
    setTimeout(() => {
      checkGrammarWithText(newText);
    }, 500); // Small delay to ensure UI updates first
  };
  
  // Helper function to check grammar with specific text
  const checkGrammarWithText = (textToCheck: string) => {
    setIsPending(true);
    
    fetch('/api/grammar-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToCheck, language })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to check grammar');
      }
      return res.json();
    })
    .then(data => {
      console.log('Grammar check completed via direct HTTP API');
      setResult(data);
      setIsPending(false);
    })
    .catch(error => {
      toast({
        title: 'Error checking grammar',
        description: error.message || 'An error occurred while checking grammar',
        variant: 'destructive'
      });
      setIsPending(false);
    });
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 md:gap-6">
      {/* Left side - Text entry */}
      <div className="flex-1">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to check for grammar and style issues..."
          className="w-full h-[40vh] sm:h-[45vh] md:h-[50vh] min-h-[150px] resize-none transition-colors bg-background text-foreground rounded-md border border-border p-2 sm:p-4"
        />
        
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex flex-row gap-2">
            <Button 
              onClick={handleCheckGrammar} 
              disabled={isPending || !text.trim()}
              className="w-[200px] bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Grammar'
              )}
            </Button>

            {result && result.suggestions && result.suggestions.filter((s: any) => !appliedCorrections.has(s.id)).length > 0 && (
              <Button 
                onClick={fixAllCorrections} 
                disabled={isPending}
                className="w-[140px] bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Fix All
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Right side - Language Selector and Results */}
      <div className="w-full md:w-1/3 lg:w-2/5 space-y-6">
        {/* Simple Language Dropdown */}
        <div className="mb-6">
          <label htmlFor="language-select" className="block text-sm font-medium text-foreground mb-2">
            Select Language
          </label>
          <select 
            id="language-select"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {languageOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Errors and suggestions */}
        <div className="mt-4 overflow-y-auto max-h-[35vh] sm:max-h-[40vh] rounded-md border border-border hover-scrollbar">
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                {/* Grammar error cards */}
                {result.suggestions && result.suggestions.filter((suggestion: any) => !appliedCorrections.has(suggestion.id)).length > 0 ? (
                  result.suggestions
                    .filter((suggestion: any) => !appliedCorrections.has(suggestion.id))
                    .map((suggestion: any) => (
                      <Card 
                        key={suggestion.id} 
                        className="mb-2 overflow-hidden border-l-4 border-l-red-500 transition-colors"
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-medium">Grammar issue</p>
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      ignoreCorrection(suggestion.id);
                                    }}
                                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Ignore</span>
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm mt-1">{suggestion.description}</p>
                              <div className="mt-2 text-sm">
                                <p className="font-mono">{suggestion.text}</p>
                                <p className="font-mono text-green-600">→ {suggestion.replacement}</p>
                              </div>
                              <Button 
                                className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                                onClick={() => applyCorrection({
                                  id: suggestion.id,
                                  type: suggestion.type,
                                  errorText: suggestion.text,
                                  replacementText: suggestion.replacement,
                                  description: suggestion.description
                                })}
                              >
                                <CheckSquare className="mr-2 h-4 w-4" />
                                Apply Correction
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    {text.trim() ? 
                      result.suggestions && result.suggestions.length === 0 ? 
                      'No grammar issues detected.' :
                      'Enter text on the left and click "Check Grammar" to see the results here.' : 
                      'Enter text to check for grammar issues.'}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

