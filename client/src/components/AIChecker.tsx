import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { useAiTool } from '@/hooks/useAiTool';
import { Progress } from '@/components/ui/progress';
import ReactMarkdown from 'react-markdown';

interface AICheckerProps {
  inputText: string;
  onSave: (result: any) => void;
}

const AIChecker: React.FC<AICheckerProps> = ({ inputText, onSave }) => {
  const { toast } = useToast();
  const [showUI, setShowUI] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { mutate, isPending } = useAiTool();

  // Run the AI detection when the component first shows
  const handleDetectAI = () => {
    if (!inputText.trim()) {
      toast({
        title: 'No text provided',
        description: 'Please enter some text to check for AI content.',
        variant: 'destructive',
      });
      return;
    }

    // Reset previous results and errors
    setError(null);
    
    mutate(
      { 
        text: inputText, 
        mode: 'aicheck'
      },
      {
        onSuccess: (data) => {
          setResult(data);
          setShowUI(true);
        },
        onError: (err) => {
          setError(err.message);
          toast({
            title: 'Error detecting AI content',
            description: 'There was a problem analyzing the text.',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const handleSave = () => {
    onSave(result);
    toast({
      title: 'Analysis saved',
      description: 'AI content detection results have been saved.',
    });
  };

  const getAIPercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'text-red-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  const renderHighlightedText = () => {
    if (!result || !result.highlights || !inputText) return inputText;

    // Sort highlights by start position, descending (to avoid offset issues)
    const sortedHighlights = [...(result.highlights || [])].sort(
      (a, b) => b.position.start - a.position.start
    );

    let highlightedText = inputText;

    // Apply highlights
    sortedHighlights.forEach((highlight) => {
      const { start, end } = highlight.position;
      const before = highlightedText.substring(0, start);
      const highlighted = highlightedText.substring(start, end);
      const after = highlightedText.substring(end);

      highlightedText = `${before}<mark class="bg-yellow-200 dark:bg-yellow-800">${highlighted}</mark>${after}`;
    });

    return highlightedText;
  };

  // Get human score (inverse of AI percentage)
  const getHumanScore = () => {
    if (!result || result.aiPercentage === undefined) return 100;
    return Math.max(0, 100 - result.aiPercentage);
  };

  return (
    <div className="flex flex-col space-y-4">
      {!showUI ? (
        <div className="flex justify-center my-8">
          <Button
            onClick={handleDetectAI}
            disabled={isPending || !inputText.trim()}
            className="w-full max-w-md"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Detect AI Content
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          {error ? (
            <Card className="p-4 bg-destructive/10 text-destructive border-destructive">
              <p>Error: {error}</p>
              <Button variant="outline" onClick={handleDetectAI} className="mt-2">
                Try Again
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* AI Score Card */}
              <Card className="p-4">
                <h2 className="text-xl font-semibold mb-4">AI Content Analysis</h2>
                
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-muted-foreground mb-1">AI Detection</p>
                    <p className={`text-3xl font-bold ${getAIPercentageColor(result?.aiPercentage || 0)}`}>
                      {result?.aiPercentage !== undefined ? `${Math.round(result.aiPercentage)}%` : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result?.aiPercentage !== undefined && result.aiPercentage < 30 
                        ? 'Likely human-written' 
                        : result?.aiPercentage !== undefined && result.aiPercentage >= 80
                          ? 'Likely AI-generated'
                          : 'Mixed content detected'}
                    </p>
                  </div>
                  
                  <div className="w-full sm:w-2/3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Human Content</span>
                      <span>AI Content</span>
                    </div>
                    <Progress value={result?.aiPercentage} className="h-3" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{getHumanScore()}%</span>
                      <span>{result?.aiPercentage !== undefined ? `${Math.round(result.aiPercentage)}%` : '0%'}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-md p-4 mt-4 relative">
                  <div className="absolute -top-3 bg-background px-2 text-sm font-medium">
                    Text Analysis
                  </div>
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderHighlightedText() }}
                  />
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSave} className="ml-2">
                    <Check className="mr-2 h-4 w-4" />
                    Save Analysis
                  </Button>
                </div>
              </Card>

              {/* Tips Card */}
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-2">Tips for AI Content</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>
                    {`
- **High AI detection score (>80%)**: This text appears to be largely AI-generated. Consider:
  - Rewriting in your own words and style
  - Adding personal experiences and unique insights
  - Breaking up long, perfect paragraphs
  - Using more informal language patterns

- **Medium AI detection (30-80%)**: Parts of this text may be AI-generated. Try:
  - Focusing on the highlighted sections to make them more personal
  - Varying sentence structure more naturally
  - Adding your unique perspective

- **Low AI detection (<30%)**: This content appears mostly human-written.
                    `}
                  </ReactMarkdown>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AIChecker;