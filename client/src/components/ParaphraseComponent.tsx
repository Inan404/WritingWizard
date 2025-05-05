import { useState } from 'react';
import { useAiTool, Style } from '@/hooks/useAiTool';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export function ParaphraseComponent() {
  const [text, setText] = useState('');
  const [paraphrasedText, setParaphrasedText] = useState('');
  const [metrics, setMetrics] = useState<{
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  } | null>(null);
  const [style, setStyle] = useState<Style>('standard');
  const [customStyle, setCustomStyle] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { toast } = useToast();
  const { mutate, isPending } = useAiTool();

  const handleSubmit = () => {
    if (!text.trim()) {
      toast({
        title: 'Empty input',
        description: 'Please enter some text to paraphrase.',
        variant: 'destructive',
      });
      return;
    }

    // If custom style is selected, ensure it has a value
    if (style === 'custom' && !customStyle.trim()) {
      toast({
        title: 'Custom style is empty',
        description: 'Please enter a custom tone for paraphrasing.',
        variant: 'destructive',
      });
      return;
    }
    
    mutate(
      { 
        text, 
        mode: 'paraphrase', 
        style,
        // Add custom style parameter when using custom style
        ...(style === 'custom' && { customTone: customStyle })
      },
      {
        onSuccess: (data) => {
          setParaphrasedText(data.paraphrasedText || '');
          setMetrics(data.metrics || null);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to paraphrase text',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paraphrasedText).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: 'Copied',
          description: 'Paraphrased text copied to clipboard!',
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to paraphrase..."
          className="min-h-[150px] h-[35vh] sm:h-[40vh] resize-none p-2 sm:p-4 hover-scrollbar"
          rows={6}
        />
        
        <div className="flex flex-wrap gap-2">
          <StyleButton 
            active={style === 'standard'} 
            onClick={() => setStyle('standard')}
            label="Standard"
          />
          <StyleButton 
            active={style === 'fluency'} 
            onClick={() => setStyle('fluency')}
            label="Fluency"
          />
          <StyleButton 
            active={style === 'formal'} 
            onClick={() => setStyle('formal')}
            label="Formal"
          />
          <StyleButton 
            active={style === 'academic'} 
            onClick={() => setStyle('academic')}
            label="Academic"
          />
          <StyleButton 
            active={style === 'custom'} 
            onClick={() => setStyle('custom')}
            label="Custom"
          />
        </div>
        
        {/* Custom style input field */}
        <AnimatePresence>
          {style === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-2 mt-2">
                <label htmlFor="custom-style" className="text-sm font-medium">
                  Custom Tone
                </label>
                <Input
                  id="custom-style"
                  placeholder="e.g. Professional, Casual, Friendly, Technical, etc."
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  className="w-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button 
          onClick={handleSubmit} 
          disabled={isPending || !text.trim() || (style === 'custom' && !customStyle.trim())}
          className="w-full mt-4"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Paraphrasing...
            </>
          ) : (
            'Paraphrase Text'
          )}
        </Button>
      </div>
      
      <div>
        <AnimatePresence>
          {paraphrasedText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex justify-between items-center p-2 bg-muted">
                    <h3 className="text-sm font-medium px-2">Paraphrased Text</h3>
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
                  <div className="p-4 text-sm whitespace-pre-wrap max-h-[35vh] sm:max-h-[40vh] overflow-y-auto hover-scrollbar">
                    {paraphrasedText}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StyleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="rounded-full"
    >
      {label}
    </Button>
  );
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} className={`h-1.5 ${color}`} />
    </div>
  );
}