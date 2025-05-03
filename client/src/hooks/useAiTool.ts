import { useMutation } from '@tanstack/react-query';

export type Mode = 'chat' | 'grammar' | 'paraphrase' | 'humanize' | 'ai-check';
export type Style = 'standard' | 'formal' | 'fluency' | 'academic' | 'custom';

interface AiToolParams {
  text: string;
  mode: Mode;
  style?: Style;
  messages?: { role: 'user' | 'assistant'; content: string }[];
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
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process AI request');
      }
      
      return data.result;
    },
  });
}