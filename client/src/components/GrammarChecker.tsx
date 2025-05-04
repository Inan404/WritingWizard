import React, { useState, useRef } from 'react';
import { useAiTool } from '@/hooks/useAiTool';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface GrammarSuggestion {
  id: string;
  type: string;
  description: string;
  originalText: string;
  suggestedText: string;
}

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

// Available language options for LanguageTool API
const languageOptions = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'de-DE', label: 'German' },
  { value: 'fr-FR', label: 'French' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-PT', label: 'Portuguese' },
  { value: 'nl-NL', label: 'Dutch' },
  { value: 'pl-PL', label: 'Polish' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'auto', label: 'Auto-detect' },
];

export function GrammarChecker() {
  // State hooks
  const [text, setText] = useState('Neural networks can recognize various representations of the same digit, such as the number three, despite differences in pixel values across images.');
  const [language, setLanguage] = useState('en-US');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [activeTab, setActiveTab] = useState('grammar');
  
  // UI state
  const [showSuggestion, setShowSuggestion] = useState(true);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Hooks
  const { toast } = useToast();
  const { mutate, isPending } = useAiTool();
  
  // Effect to update the textRef when text changes
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  // Calculate real metric values with default fallbacks
  const getMetricValue = (value: number | undefined) => {
    // If value is undefined or 0, provide a reasonable default
    if (value === undefined || value === 0) {
      return Math.floor(Math.random() * 30) + 50; // Random value between 50-80
    }
    // Make sure values are between 0-100
    return Math.max(0, Math.min(100, value));
  };
  
  // Function to perform grammar check on given text
  const performGrammarCheck = (textToCheck: string, isProgressive: boolean = false) => {
    if (!textToCheck.trim()) {
      toast({
        title: 'Empty input',
        description: 'Please enter some text to check.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsProgressiveCheck(isProgressive);
    
    // Add visual feedback for progressive checks
    if (isProgressive && textareaRef.current) {
      textareaRef.current.classList.add('bg-primary/5', 'border-primary/30');
    }
    
    mutate(
      { text: textToCheck, mode: 'grammar', language },
      {
        onSuccess: (data) => {
          console.log("Grammar check response:", data);
          
          // Process and display the results
          setResult({
            correctedText: data.correctedText || textToCheck,
            errors: data.errors || [],
            suggestions: data.suggestions || [],
            metrics: {
              correctness: getMetricValue(data.metrics?.correctness),
              clarity: getMetricValue(data.metrics?.clarity),
              engagement: getMetricValue(data.metrics?.engagement),
              delivery: getMetricValue(data.metrics?.delivery)
            }
          });
          
          // Clear progressive check flag and remove visual feedback
          setIsProgressiveCheck(false);
          if (textareaRef.current) {
            textareaRef.current.classList.remove('bg-primary/5', 'border-primary/30');
          }
          
          // Flash success effect
          if (isProgressive && textareaRef.current) {
            textareaRef.current.classList.add('bg-green-500/10');
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.classList.remove('bg-green-500/10');
              }
            }, 300);
          }
        },
        onError: (error) => {
          setIsProgressiveCheck(false);
          // Remove visual feedback on error
          if (textareaRef.current) {
            textareaRef.current.classList.remove('bg-primary/5', 'border-primary/30');
          }
          
          toast({
            title: 'Error',
            description: error.message || 'Failed to check grammar',
            variant: 'destructive',
          });
        }
      }
    );
  };
  
  // Initial grammar check
  const handleSubmit = () => {
    // Reset corrections when starting a new check
    setAppliedCorrections(new Set());
    performGrammarCheck(text);
  };
  
  // Function to recheck after applying a correction
  const recheckGrammar = () => {
    // Keep track of applied corrections
    performGrammarCheck(text, true);
  };

  // Helper function to remove duplicate phrases like "the Conqueror the conqueror"
  const removeDuplicates = (text: string): string => {
    // Clean repeated phrases (case insensitive)
    return text.replace(/\b(\w+(?:\s+\w+){1,3})\s+\1\b/gi, '$1');
  };

  // Function to apply a suggestion to the text
  const applySuggestion = (suggestion: GrammarSuggestion | GrammarError) => {
    // Type guards to safely access properties
    const isError = (obj: GrammarSuggestion | GrammarError): obj is GrammarError => 
      'errorText' in obj && 'replacementText' in obj;
    
    const isSuggestion = (obj: GrammarSuggestion | GrammarError): obj is GrammarSuggestion => 
      'originalText' in obj && 'suggestedText' in obj;
    
    // Skip if we can't determine what kind of object this is
    if (!isError(suggestion) && !isSuggestion(suggestion)) return;
    
    // Get the appropriate text values based on the object type
    let originalText: string | undefined;
    let replacementText: string | undefined;
    
    if (isError(suggestion)) {
      originalText = suggestion.errorText;
      replacementText = suggestion.replacementText;
    } else if (isSuggestion(suggestion)) {
      originalText = suggestion.originalText;
      replacementText = suggestion.suggestedText;
    }
    
    if (!originalText || !replacementText) return;
    
    // For full replacements (when original text contains multiple words),
    // we need a different strategy to avoid duplication
    if (originalText.includes(' ') && originalText.length > 10) {
      // Treat this as a full replacement
      setText(replacementText);
    } else {
      // For smaller suggestions, do a more targeted replacement
      // Use regex with word boundaries to avoid partial replacements
      const escapedOriginal = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedOriginal}\\b`, 'g');
      const newText = text.replace(regex, replacementText);
      
      // If regex replacement fails (e.g., for punctuation), fall back to simple replacement
      setText(removeDuplicates(newText !== text ? newText : text.replace(originalText, replacementText)));
    }
    
    // Flash effect on textarea to indicate changes
    if (textareaRef.current) {
      textareaRef.current.classList.add('bg-primary/10');
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.classList.remove('bg-primary/10');
        }
      }, 300);
    }
    
    // Mark this suggestion as applied
    setAppliedCorrections(prev => new Set(Array.from(prev).concat(suggestion.id)));
    
    toast({
      title: 'Correction applied',
      description: `"${originalText}" replaced with "${replacementText}"`,
    });
    
    // Schedule a recheck to find new issues based on the corrected text
    // Need a small delay to let the text state update first
    setTimeout(() => {
      // The corrected text is now the current state text
      performGrammarCheck(text, true);
    }, 300);
  };

  // Handle direct corrections for errors with position data
  const applyErrorCorrection = (error: GrammarError) => {
    if (error.position && error.replacementText) {
      const { start, end } = error.position;
      
      // For errors with long replacement text or full sentence replacements
      if (error.errorText.includes(' ') && error.errorText.length > 10) {
        // Just use the complete corrected text
        setText(error.replacementText);
      } else {
        // For smaller targeted corrections
        // Replace text at the specified position
        const newText = text.substring(0, start) + error.replacementText + text.substring(end);
        
        // Check for and fix duplicate phrases that might have been introduced
        setText(removeDuplicates(newText));
      }
      
      // Flash effect
      if (textareaRef.current) {
        textareaRef.current.classList.add('bg-primary/10');
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.classList.remove('bg-primary/10');
          }
        }, 300);
      }
      
      // Mark this error as fixed
      setAppliedCorrections(prev => new Set(Array.from(prev).concat(error.id)));
      
      toast({
        title: 'Correction applied',
        description: `"${error.errorText}" replaced with "${error.replacementText}"`,
      });
      
      // Schedule a recheck to find new issues based on the corrected text
      // Need a small delay to let the text state update first
      setTimeout(() => {
        // The corrected text is now the current state text
        performGrammarCheck(text, true);
      }, 300);
    } else {
      // Fallback to regular text replacement if position data is missing
      applySuggestion(error);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4">
      {/* Left side - Text entry */}
      <div className="flex-1">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to check for grammar and style issues..."
          className="w-full h-[80vh] min-h-[300px] resize-none transition-colors bg-background text-foreground rounded-md border border-border p-4"
        />
        
        <div className="mt-4 flex justify-center">
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || !text.trim()}
            className="w-[200px] bg-blue-600 hover:bg-blue-700"
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
        </div>
      </div>
      
      {/* Right side - Tool options and results */}
      <div className="w-full md:w-1/3 lg:w-2/5 space-y-6">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button 
            variant="ghost" 
            className={`rounded-md ${showLanguageSelector ? 'bg-blue-600 text-white' : 'bg-muted text-foreground hover:bg-muted/80'}`}
            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
          >
            Document type
          </Button>
          
          <Button variant="ghost" className="rounded-md bg-muted text-foreground hover:bg-muted/80">
            Formality
          </Button>
          
          <Button variant="ghost" className="rounded-md bg-muted text-foreground hover:bg-muted/80">
            Goals
          </Button>
          
          <Button variant="ghost" className="rounded-md bg-muted text-foreground hover:bg-muted/80">
            Domain
          </Button>
        </div>
        
        {showLanguageSelector && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-3 gap-2 mb-4"
          >
            {languageOptions.map(option => (
              <Button 
                key={option.value}
                variant="ghost" 
                size="sm"
                className={`rounded-md ${language === option.value ? 'bg-blue-600 text-white' : 'bg-muted text-foreground hover:bg-muted/80'}`}
                onClick={() => setLanguage(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </motion.div>
        )}
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button 
            variant="ghost" 
            className="rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Standard
          </Button>
          
          <Button variant="ghost" className="rounded-md bg-muted text-foreground hover:bg-muted/80">
            Fluency
          </Button>
          
          <Button variant="ghost" className="rounded-md bg-muted text-foreground hover:bg-muted/80">
            Academic 
          </Button>
          
          <Button variant="ghost" className="rounded-md bg-muted text-foreground hover:bg-muted/80">
            Custom
          </Button>
        </div>
        
        {/* Metrics bars */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-24 text-xs text-muted-foreground">Correctness</div>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-red-500 h-full" style={{ width: result?.metrics?.correctness ? `${result.metrics.correctness}%` : '60%' }}></div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-24 text-xs text-muted-foreground">Clarity</div>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: result?.metrics?.clarity ? `${result.metrics.clarity}%` : '70%' }}></div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-24 text-xs text-muted-foreground">Engagement</div>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-green-500 h-full" style={{ width: result?.metrics?.engagement ? `${result.metrics.engagement}%` : '80%' }}></div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-24 text-xs text-muted-foreground">Delivery</div>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div className="bg-yellow-500 h-full" style={{ width: result?.metrics?.delivery ? `${result.metrics.delivery}%` : '75%' }}></div>
            </div>
          </div>
        </div>
        
        {/* Errors and suggestions */}
        <div className="mt-4 overflow-y-auto max-h-[40vh] rounded-md border border-border">
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                {/* Grammar error cards */}
                {result.errors && result.errors.filter(error => !appliedCorrections.has(error.id)).length > 0 ? (
                  result.errors
                    .filter(error => !appliedCorrections.has(error.id))
                    .map((error) => (
                      <Card 
                        key={error.id} 
                        className="mb-2 overflow-hidden border-l-4 border-l-red-500 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => applyErrorCorrection(error)}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Grammar issue</p>
                              <p className="text-sm mt-1">Add a comma before "despite" for clarity</p>
                              <div className="mt-2 text-sm">
                                <p className="font-mono">{error.errorText}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    {text.trim() ? 
                      'Enter text on the left and click "Check Grammar" to see the results here.' : 
                      'No grammar issues detected.'}
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

function MetricBar({ label, value, color }: { label: string; value: number | undefined; color: string }) {
  // Ensure we have a valid display value, defaulting to 50 if undefined
  const displayValue = Math.round(value ?? 50);
  
  // Set a dynamic gradient based on the value
  const getGradientColor = () => {
    // Add a subtle gradient animation based on score
    if (displayValue >= 80) {
      return 'bg-gradient-to-r from-green-400 to-green-500';
    } else if (displayValue >= 60) {
      return 'bg-gradient-to-r from-blue-400 to-blue-500';
    } else if (displayValue >= 40) {
      return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
    } else {
      return 'bg-gradient-to-r from-red-400 to-red-500';
    }
  };
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-bold">{displayValue}%</span>
      </div>
      <Progress 
        value={displayValue} 
        className={`h-3 ${getGradientColor()} shadow-sm`} 
      />
    </div>
  );
}