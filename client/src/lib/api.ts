import { apiRequest } from './queryClient';
import { WritingStyle } from '@/context/WritingContext';

interface GrammarCheckRequest {
  text: string;
}

interface GrammarCheckResponse {
  corrected: string;
  highlights: Array<{
    type: "suggestion" | "error" | "ai";
    start: number;
    end: number;
    suggestion?: string;
    message?: string;
  }>;
  suggestions: Array<{
    id: string;
    type: "grammar" | "suggestion" | "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>;
}

interface ParaphraseRequest {
  text: string;
  style: WritingStyle;
}

interface ParaphraseResponse {
  paraphrased: string;
}

interface HumanizeRequest {
  text: string;
  style: WritingStyle;
}

interface HumanizeResponse {
  humanized: string;
}

interface AICheckRequest {
  text: string;
}

interface AICheckResponse {
  aiAnalyzed: string;
  aiPercentage: number;
  highlights: Array<{
    type: "ai";
    start: number;
    end: number;
    message?: string;
  }>;
  suggestions: Array<{
    id: string;
    type: "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>;
}

interface GenerateWritingRequest {
  sample: string;
  references: string;
  instructions: string;
  length: string;
  style: string;
  format: string;
}

interface GenerateWritingResponse {
  generatedText: string;
}

export const WritingAPI = {
  checkGrammar: async (text: string): Promise<GrammarCheckResponse> => {
    const response = await apiRequest('POST', '/api/grammar-check', { text });
    return response.json();
  },
  
  paraphrase: async (text: string, style: WritingStyle): Promise<ParaphraseResponse> => {
    const response = await apiRequest('POST', '/api/paraphrase', { text, style });
    return response.json();
  },
  
  humanize: async (text: string, style: WritingStyle): Promise<HumanizeResponse> => {
    const response = await apiRequest('POST', '/api/humanize', { text, style });
    return response.json();
  },
  
  checkAI: async (text: string): Promise<AICheckResponse> => {
    const response = await apiRequest('POST', '/api/ai-check', { text });
    return response.json();
  },
  
  generateWriting: async (data: GenerateWritingRequest): Promise<GenerateWritingResponse> => {
    const response = await apiRequest('POST', '/api/generate-writing', data);
    return response.json();
  },

  saveWritingChat: async (data: {
    rawText: string;
    grammarResult?: string;
    paraphraseResult?: string;
    aiCheckResult?: string;
    humanizeResult?: string;
  }) => {
    const response = await apiRequest('POST', '/api/save-writing-chat', data);
    return response.json();
  }
};
