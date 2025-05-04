import React, { useState, useRef } from 'react';
import { useAiTool } from '@/hooks/useAiTool';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
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
  const [text, setText] = useState('Neural networks can recognize various representations of the same digit, such as the number three, despite differences in pixel values across images.');
  const [language, setLanguage] = useState('en-US');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [appliedCorrections, setAppliedCorrections] = useState<Set<string>>(new Set());
  
  // UI state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Hooks
  const { toast } = useToast();
  const { mutate, isPending } = useAiTool();
  
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
    
    // Call API to check grammar
    mutate(
      { text, mode: 'grammar', language },
      {
        onSuccess: (data: any) => {
          // Update with results
          setResult({
            errors: data.errors || [],
            metrics: {
              correctness: data.metrics?.correctness || 70,
              clarity: data.metrics?.clarity || 85,
              engagement: data.metrics?.engagement || 78,
              delivery: data.metrics?.delivery || 82
            }
          });
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
          className="w-full h-[80vh] min-h-[300px] resize-none transition-colors bg-background text-foreground rounded-md border border-border p-4"
        />
        
        <div className="mt-4 flex justify-center">
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

