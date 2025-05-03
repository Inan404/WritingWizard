import { useMutation } from '@tanstack/react-query';

export type Mode = 'chat' | 'grammar' | 'paraphrase' | 'humanize' | 'ai-check';
export type Style = 'standard' | 'formal' | 'fluency' | 'academic' | 'custom';

interface AiToolParams {
  text: string;
  mode: Mode;
  style?: Style;
  messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
}

export function useAiTool() {
  return useMutation({
    mutationFn: async ({ text, mode, style, messages }: AiToolParams) => {
      const payload: any = { mode };
      
      // For chat mode, use messages array if provided
      if (mode === 'chat' && messages && messages.length > 0) {
        payload.messages = messages;
      } else {
        // For all other modes, use text
        payload.text = text;
      }
      
      // Add style if provided
      if (style) {
        payload.style = style;
      }
      
      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || errorData.error || 'Failed to process AI request');
      }
      
      const data = await res.json().catch(() => ({}));
      
      // Different modes return different response formats
      if (mode === 'grammar') {
        return {
          correctedText: data.correctedText || data.suggestedText || 
            (data.suggestions && data.suggestions[0]?.suggestedText) || text,
          errors: data.errors || [],
          suggestions: data.suggestions || []
        };
      } else if (mode === 'paraphrase') {
        return {
          paraphrasedText: data.paraphrased || data.paraphrasedText || text,
          metrics: data.metrics || {}
        };
      } else if (mode === 'humanize') {
        return {
          humanizedText: data.humanized || data.humanizedText || text,
          metrics: data.metrics || {}
        };
      } else if (mode === 'ai-check') {
        return {
          aiPercentage: data.aiPercentage || 0,
          metrics: data.metrics || {},
          highlights: data.highlights || []
        };
      } else if (mode === 'chat') {
        return data.response || '';
      }
      
      return data;
    },
  });
}