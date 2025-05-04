import { useState } from 'react';
import { useAiTool } from '@/hooks/useAiTool';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface AICheckProps {
  defaultText?: string;
}

export function AICheckComponent({ defaultText = '' }: AICheckProps) {
  const [text, setText] = useState(defaultText);
  const [aiPercentage, setAiPercentage] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<{
    correctness?: number;
    clarity?: number;
    engagement?: number;
    delivery?: number;
  } | null>(null);
  
  const { toast } = useToast();
  const { mutate, isPending } = useAiTool();

  // For ZEROGPT API key
  const hasZeroGptApi = true; // ZeroGPT API is available now

  const handleSubmit = () => {
    if (!text.trim()) {
      toast({
        title: 'Empty input',
        description: 'Please enter some text to check.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!hasZeroGptApi) {
      toast({
        title: 'Missing API Key',
        description: 'ZeroGPT API key is required for AI detection.',
        variant: 'destructive',
      });
      return;
    }
    
    mutate(
      { text, mode: 'ai-check' },
      {
        onSuccess: (data) => {
          setAiPercentage(data.aiPercentage || 0);
          setMetrics(data.metrics || null);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to check for AI content',
            variant: 'destructive',
          });
        }
      }
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to check if it was written by AI..."
          className="min-h-[200px] resize-none"
          rows={8}
        />
        
        <Button 
          onClick={handleSubmit} 
          disabled={isPending || !text.trim() || !hasZeroGptApi}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            'Check for AI Content'
          )}
        </Button>
        
        {!hasZeroGptApi && (
          <div className="flex items-center justify-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              ZeroGPT API key required for AI detection.
            </p>
          </div>
        )}
      </div>
      
      <div>
        <AnimatePresence>
          {aiPercentage !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative h-36 w-36 flex items-center justify-center mb-4">
                      <svg viewBox="0 0 100 100" className="h-full w-full transform -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="10"
                          fill="transparent"
                          className="text-muted-foreground/20"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * aiPercentage) / 100}
                          className={`${aiPercentage > 70 ? 'text-red-500' : aiPercentage > 40 ? 'text-yellow-500' : 'text-green-500'}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">{aiPercentage}%</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">AI Content Detection</h3>
                    <span className="text-center text-sm text-muted-foreground">
                      {aiPercentage > 70 
                        ? 'Very likely AI-generated content' 
                        : aiPercentage > 40 
                          ? 'Possibly AI-generated content' 
                          : 'Likely human-written content'}
                    </span>
                  </div>
                  
                  {metrics && (
                    <div className="space-y-3 mt-4">
                      <h4 className="text-sm font-medium">Content Analysis</h4>
                      <div className="space-y-2">
                        {metrics.correctness !== undefined && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Correctness</span>
                              <span>{metrics.correctness}%</span>
                            </div>
                            <Progress value={metrics.correctness} className="h-1.5" />
                          </div>
                        )}
                        {metrics.clarity !== undefined && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Clarity</span>
                              <span>{metrics.clarity}%</span>
                            </div>
                            <Progress value={metrics.clarity} className="h-1.5" />
                          </div>
                        )}
                        {metrics.engagement !== undefined && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Engagement</span>
                              <span>{metrics.engagement}%</span>
                            </div>
                            <Progress value={metrics.engagement} className="h-1.5" />
                          </div>
                        )}
                        {metrics.delivery !== undefined && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Delivery</span>
                              <span>{metrics.delivery}%</span>
                            </div>
                            <Progress value={metrics.delivery} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}