import { useState } from 'react';
import { useAiTool, Mode, Style } from '@/hooks/useAiTool';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AiToolProps {
  mode: Mode;
  defaultText?: string;
}

export function AiTool({ mode, defaultText = '' }: AiToolProps) {
  const [input, setInput] = useState(defaultText);
  const [output, setOutput] = useState('');
  const [style, setStyle] = useState<Style>('standard');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const { mutate, isPending } = useAiTool();

  const handleSubmit = () => {
    if (!input.trim()) {
      toast({
        title: 'Input is empty',
        description: 'Please enter some text to process.',
        variant: 'destructive',
      });
      return;
    }
    
    mutate(
      { text: input, mode, style },
      {
        onSuccess: (result) => {
          let resultText = '';
          
          // Handle different response formats based on mode
          if (mode === 'grammar') {
            resultText = result.correctedText || '';
          } else if (mode === 'paraphrase') {
            resultText = result.paraphrasedText || '';
          } else if (mode === 'humanize') {
            resultText = result.humanizedText || '';
          } else if (mode === 'chat') {
            resultText = typeof result === 'string' ? result : '';
          } else {
            // Fallback for other modes or unknown format
            resultText = typeof result === 'string' 
              ? result 
              : JSON.stringify(result, null, 2);
          }
          
          setOutput(resultText);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to process request',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: 'Copied',
          description: 'Text copied to clipboard!',
        });
      },
      (err) => {
        toast({
          title: 'Failed to copy',
          description: 'Could not copy text to clipboard.',
          variant: 'destructive',
        });
      }
    );
  };

  // Style options differ based on mode
  const showStyleOptions = mode === 'paraphrase' || mode === 'humanize';

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={getPlaceholder(mode)}
          className="min-h-[150px] p-4 text-sm"
          rows={6}
        />
        
        {showStyleOptions && (
          <div className="flex gap-4 items-center">
            <span className="text-sm text-muted-foreground">Style:</span>
            <Select value={style} onValueChange={(value) => setStyle(value as Style)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="fluency">Fluent</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="custom">Creative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        <Button 
          onClick={handleSubmit} 
          disabled={isPending || !input.trim()}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            getActionLabel(mode)
          )}
        </Button>
      </div>

      <AnimatePresence>
        {output && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex justify-between items-center p-2 bg-muted">
                  <h3 className="text-sm font-medium px-2">Result</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-8 px-2"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="p-4 text-sm whitespace-pre-wrap">
                  {output}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper functions
function getPlaceholder(mode: Mode): string {
  switch (mode) {
    case 'grammar':
      return 'Enter text to check for grammar and style issues...';
    case 'paraphrase':
      return 'Enter text to paraphrase...';
    case 'humanize':
      return 'Enter AI-generated text to make it sound more human...';
    case 'chat':
      return 'Type your message to the AI assistant...';
    case 'ai-check':
      return 'Enter text to check if it was written by AI...';
    default:
      return 'Enter text...';
  }
}

function getActionLabel(mode: Mode): string {
  switch (mode) {
    case 'grammar':
      return 'Check Grammar';
    case 'paraphrase':
      return 'Paraphrase';
    case 'humanize':
      return 'Humanize';
    case 'chat':
      return 'Send Message';
    case 'ai-check':
      return 'Check for AI';
    default:
      return 'Process';
  }
}