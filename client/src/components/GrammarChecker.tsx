import React, { useState, useRef, useEffect } from 'react';
import { useAiTool } from '@/hooks/useAiTool';
import { useAiWebSocket } from '@/hooks/useAiWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2, WifiOff } from 'lucide-react';
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
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [appliedCorrections, setAppliedCorrections] = useState<Set<string>>(new Set());
  
  // UI state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Toast hook
  const { toast } = useToast();
  
  // WebSocket hook for real-time grammar checking
  const { 
    processText, 
    isProcessing, 
    result, 
    isConnected 
  } = useAiWebSocket({
    toolType: 'grammar-check',
    resultMessageType: 'grammar-result',
    onSuccess: (data: any) => {
      console.log('Grammar check result received:', data);
      // Reset applied corrections when we get new results
      setAppliedCorrections(new Set());
    },
    onError: (error: Error) => {
      toast({
        title: 'Error checking grammar',
        description: error.message || 'An error occurred while checking grammar',
        variant: 'destructive'
      });
    }
  });
  
  // Fallback to HTTP API
  const { mutate, isPending: isHttpPending } = useAiTool();
  
  // Flag for tracking if we're loading from either WebSocket or HTTP
  const isPending = isProcessing || isHttpPending;
  
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
    
    // Try to use WebSocket first
    if (isConnected) {
      const sent = processText(text, { language });
      if (sent) {
        // WebSocket message sent successfully
        return;
      }
    }
    
    // Fall back to HTTP API if WebSocket fails
    console.log('Using HTTP fallback for grammar check');
    mutate(
      { text, mode: 'grammar', language },
      {
        onSuccess: (data: any) => {
          // The result will be set by our WebSocket hook
          console.log('Grammar check completed via HTTP API');
        },
        onError: (error: any) => {
          toast({
            title: 'Error checking grammar',
            description: error.message || 'An error occurred while checking grammar',
            variant: 'destructive'
          });
        }
      }
    );
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
          className="w-full h-[50vh] min-h-[200px] resize-none transition-colors bg-background text-foreground rounded-md border border-border p-4"
        />
        
        <div className="mt-4 flex flex-col items-center gap-2">
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
          
          {/* WebSocket connection indicator */}
          <div className="flex items-center text-xs text-muted-foreground">
            {isConnected ? (
              <span className="inline-flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                Real-time mode active
              </span>
            ) : (
              <span className="inline-flex items-center">
                <WifiOff className="h-3 w-3 mr-1 text-yellow-500" />
                Using standard mode
              </span>
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
        <div className="mt-4 overflow-y-auto max-h-[40vh] rounded-md border border-border show-scrollbar">
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                {/* Grammar error cards */}
                {result.errors && result.errors.filter((error: GrammarError) => !appliedCorrections.has(error.id)).length > 0 ? (
                  result.errors
                    .filter((error: GrammarError) => !appliedCorrections.has(error.id))
                    .map((error: GrammarError) => (
                      <Card 
                        key={error.id} 
                        className="mb-2 overflow-hidden border-l-4 border-l-red-500 cursor-pointer hover:bg-secondary/50 transition-colors"
                        onClick={() => applyCorrection(error)}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Grammar issue</p>
                              <p className="text-sm mt-1">{error.description}</p>
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

