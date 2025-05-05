/**
 * HumanizerComponent.tsx
 * 
 * This component transforms AI-generated text to make it sound more human and natural.
 * It offers various style options to adjust the tone of the humanized output.
 * 
 * Features:
 * - Several humanization styles (standard, conversational, professional)
 * - Custom tone option for personalized output
 * - Animated transitions and feedback
 * - Copy to clipboard functionality
 * 
 * The component leverages the Perplexity API through the useAiTool hook
 * to perform the text humanization.
 */

import { useState } from 'react';
import { useAiTool, Style } from '@/hooks/useAiTool';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export function HumanizerComponent() {
  const [text, setText] = useState('');
  const [humanizedText, setHumanizedText] = useState('');
  const [style, setStyle] = useState<Style>('standard');
  const [customTone, setCustomTone] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { toast } = useToast();
  const { mutate, isPending } = useAiTool();

  const handleSubmit = () => {
    if (!text.trim()) {
      toast({
        title: 'Empty input',
        description: 'Please enter some AI-generated text to humanize.',
        variant: 'destructive',
      });
      return;
    }
    
    mutate(
      { 
        text, 
        mode: 'humanize', 
        style,
        customTone: style === 'custom' ? customTone : undefined 
      },
      {
        onSuccess: (data) => {
          setHumanizedText(data.humanizedText || '');
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to humanize text',
            variant: 'destructive',
          });
        }
      }
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(humanizedText).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: 'Copied',
          description: 'Humanized text copied to clipboard!',
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter AI-generated text to make it sound more human..."
          className="min-h-[150px] h-[40vh] resize-none"
          rows={6}
        />
        
        <div className="space-y-3">
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
          
          {style === 'custom' && (
            <Input
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
              placeholder="Enter custom tone (e.g., Professional, Casual, Friendly)"
              className="w-full"
            />
          )}
        </div>
        
        <Button 
          onClick={handleSubmit} 
          disabled={isPending || !text.trim()}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Humanizing...
            </>
          ) : (
            'Humanize Text'
          )}
        </Button>
      </div>
      
      <div>
        <AnimatePresence>
          {humanizedText && (
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
                    <h3 className="text-sm font-medium px-2">Humanized Text</h3>
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
                    {humanizedText}
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

