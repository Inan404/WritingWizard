import { useState } from 'react';
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
  originalText?: string;
  suggestedText?: string;
}

export function GrammarChecker() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{
    correctedText: string;
    suggestions: GrammarSuggestion[];
    metrics?: {
      correctness: number;
      clarity: number;
      engagement: number;
      delivery: number;
    };
  } | null>(null);
  
  const { toast } = useToast();
  const { mutate, isPending } = useAiTool();

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
          setResult({
            correctedText: data.correctedText || text,
            suggestions: data.suggestions || [],
            metrics: data.metrics || {
              correctness: 0,
              clarity: 0,
              engagement: 0,
              delivery: 0
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

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to check for grammar and style issues..."
          className="min-h-[200px] resize-none"
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
              
              {result.suggestions.length > 0 ? (
                <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
                  {result.suggestions.map((suggestion) => (
                    <Card key={suggestion.id} className="overflow-hidden border-l-4 border-l-red-500">
                      <CardContent className="p-3">
                        <div className="flex gap-2 items-start">
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{suggestion.type}</p>
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
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">No grammar issues found.</p>
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

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className={`h-2 ${color}`} />
    </div>
  );
}