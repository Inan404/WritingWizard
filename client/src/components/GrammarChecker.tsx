import { useState, useRef, useEffect } from 'react';
import { useAiTool } from '@/hooks/useAiTool';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
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

export function GrammarChecker() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{
    correctedText?: string;
    errors?: GrammarError[];
    suggestions: GrammarSuggestion[];
    metrics?: {
      correctness: number;
      clarity: number;
      engagement: number;
      delivery: number;
    };
  } | null>(null);
  
  // Track which errors/suggestions have been applied
  const [appliedCorrections, setAppliedCorrections] = useState<Set<string>>(new Set());
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { mutate, isPending } = useAiTool();

  // Calculate real metric values with default fallbacks
  const getMetricValue = (value: number = 0) => {
    // Make sure values are between 0-100
    return Math.max(0, Math.min(100, value));
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      toast({
        title: 'Empty input',
        description: 'Please enter some text to check.',
        variant: 'destructive',
      });
      return;
    }
    
    mutate(
      { text, mode: 'grammar' },
      {
        onSuccess: (data) => {
          console.log("Grammar check response:", data);
          
          // Process and display the results
          setResult({
            correctedText: data.correctedText || text,
            errors: data.errors || [],
            suggestions: data.suggestions || [],
            metrics: {
              correctness: getMetricValue(data.metrics?.correctness),
              clarity: getMetricValue(data.metrics?.clarity),
              engagement: getMetricValue(data.metrics?.engagement),
              delivery: getMetricValue(data.metrics?.delivery)
            }
          });
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to check grammar',
            variant: 'destructive',
          });
        }
      }
    );
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
    } else {
      // Fallback to regular text replacement if position data is missing
      applySuggestion(error);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to check for grammar and style issues..."
          className="min-h-[200px] resize-none transition-colors"
          rows={8}
        />
        
        <Button 
          onClick={handleSubmit} 
          disabled={isPending || !text.trim()}
          className="w-full"
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
      
      <div>
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {result.metrics && (
                <div className="grid grid-cols-2 gap-4">
                  <MetricBar 
                    label="Correctness" 
                    value={result.metrics.correctness} 
                    color="bg-red-500" 
                  />
                  <MetricBar 
                    label="Clarity" 
                    value={result.metrics.clarity} 
                    color="bg-blue-500" 
                  />
                  <MetricBar 
                    label="Engagement" 
                    value={result.metrics.engagement} 
                    color="bg-green-500" 
                  />
                  <MetricBar 
                    label="Delivery" 
                    value={result.metrics.delivery} 
                    color="bg-yellow-500" 
                  />
                </div>
              )}
              
              {/* Display errors - filter out applied corrections */}
              {result.errors && result.errors.filter(error => !appliedCorrections.has(error.id)).length > 0 && (
                <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                  <h3 className="text-sm font-medium mb-2">Errors to Fix</h3>
                  {result.errors
                    .filter(error => !appliedCorrections.has(error.id))
                    .map((error) => (
                      <Card 
                        key={error.id} 
                        className="overflow-hidden border-l-4 border-l-red-500 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => applyErrorCorrection(error)}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{error.type}</p>
                              <p className="text-xs text-muted-foreground mt-1">{error.description}</p>
                              <div className="mt-2 text-xs">
                                <p className="line-through">{error.errorText}</p>
                                <p className="text-green-500">{error.replacementText}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
              
              {/* Display suggestions - filter out applied corrections */}
              {result.suggestions.filter(suggestion => !appliedCorrections.has(suggestion.id)).length > 0 ? (
                <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                  <h3 className="text-sm font-medium mb-2">Suggestions</h3>
                  {result.suggestions
                    .filter(suggestion => !appliedCorrections.has(suggestion.id))
                    .map((suggestion) => (
                      <Card 
                        key={suggestion.id} 
                        className="overflow-hidden border-l-4 border-l-amber-500 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => suggestion.originalText && suggestion.suggestedText ? applySuggestion(suggestion) : null}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium capitalize">{suggestion.type}</p>
                              <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                              {suggestion.originalText && suggestion.suggestedText && (
                                <div className="mt-2 text-xs">
                                  <p className="line-through">{suggestion.originalText}</p>
                                  <p className="text-green-500">{suggestion.suggestedText}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                // If no suggestions or all are applied, show the "no issues" card
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      {appliedCorrections.size > 0 
                        ? "All issues have been fixed!" 
                        : "No grammar issues found."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MetricBar({ label, value, color }: { label: string; value: number | undefined; color: string }) {
  // Ensure we have a valid display value, defaulting to 50 if undefined
  const displayValue = Math.round(value ?? 50);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span>{displayValue}%</span>
      </div>
      <Progress value={displayValue} className={`h-2 ${color}`} />
    </div>
  );
}