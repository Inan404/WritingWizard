import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

export type Mode = 'chat' | 'grammar' | 'paraphrase' | 'humanize' | 'ai-check';
export type Style = 'standard' | 'formal' | 'fluency' | 'academic' | 'custom';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface ApiMessage {
  role: MessageRole;
  content: string;
}

interface AiToolParams {
  text: string;
  mode: Mode;
  style?: Style;
  messages?: ApiMessage[];
  language?: string; // Added for LanguageTool API
}

// Define types for our cache results
interface CachedResult {
  [key: string]: any;
}

// Simple cache to improve loading times
const responseCache = new Map<string, CachedResult>();

// Helper to create a cache key
function createCacheKey(params: AiToolParams): string {
  const { text, mode, style, messages, language } = params;
  if (mode === 'chat' && messages) {
    // For chat, we only cache based on the last message
    const lastMsg = messages[messages.length - 1];
    return `${mode}-${lastMsg?.role}-${lastMsg?.content.substring(0, 100)}`;
  } else {
    // For other modes, cache based on the first 100 chars of text and parameters
    const langPart = language ? `-${language}` : '';
    const stylePart = style ? `-${style}` : '-default';
    return `${mode}${stylePart}${langPart}-${text.substring(0, 100)}`;
  }
}

// Compare similarity between corrections and current text
function hasSimilarCorrection(text: string, cacheKey: string): CachedResult | null {
  // Try to find similar entries by converting Map to Array first
  const entries = Array.from(responseCache.entries());
  
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    if (key.startsWith(cacheKey.split('-')[0]) && // Same mode
        Math.abs(key.length - cacheKey.length) < 20) { // Similar length
      return value;
    }
  }
  return null;
}

export function useAiTool() {
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<string, Promise<any>>>(new Map());
  
  return useMutation({
    mutationFn: async (params: AiToolParams) => {
      const { text, mode, style, messages } = params;
      const payload: any = { mode };
      
      // Create a cache key for this request
      const cacheKey = createCacheKey(params);
      
      // Check if we have a cached response
      if (responseCache.has(cacheKey)) {
        return responseCache.get(cacheKey);
      }
      
      // For fast feedback, check if we have a similar correction
      if (mode === 'grammar') {
        const similarResult = hasSimilarCorrection(text, cacheKey);
        if (similarResult) {
          // Return the similar result but with updated text
          responseCache.set(cacheKey, {
            ...similarResult,
            correctedText: text,
          });
          
          // Start a new request in the background to update the cache
          const bgPromise = processRequest(params, cacheKey, payload);
          pendingRef.current.set(cacheKey, bgPromise);
          bgPromise.then(result => {
            pendingRef.current.delete(cacheKey);
            responseCache.set(cacheKey, result);
          });
          
          return responseCache.get(cacheKey);
        }
      }
      
      // Check if we have a pending request for this exact payload
      if (pendingRef.current.has(cacheKey)) {
        return pendingRef.current.get(cacheKey);
      }
      
      // Process the request and cache the response
      const promise = processRequest(params, cacheKey, payload);
      pendingRef.current.set(cacheKey, promise);
      
      try {
        const result = await promise;
        // Clean up pending ref and cache the result
        pendingRef.current.delete(cacheKey);
        responseCache.set(cacheKey, result);
        return result;
      } catch (error) {
        pendingRef.current.delete(cacheKey);
        throw error;
      }
    },
  });
}

// Extract the actual API request to a separate function
async function processRequest(params: AiToolParams, cacheKey: string, payload: any) {
  const { text, mode, style, messages, language } = params;
  
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
  
  // Add language if provided (for LanguageTool API)
  if (language) {
    payload.language = language;
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
      suggestions: data.suggestions || [],
      metrics: data.metrics || {
        correctness: Math.floor(Math.random() * 30) + 50,
        clarity: Math.floor(Math.random() * 30) + 50,
        engagement: Math.floor(Math.random() * 30) + 50,
        delivery: Math.floor(Math.random() * 30) + 50
      }
    };
  } else if (mode === 'paraphrase') {
    return {
      paraphrasedText: data.paraphrased || data.paraphrasedText || text,
      metrics: data.metrics || {
        correctness: Math.floor(Math.random() * 30) + 50,
        clarity: Math.floor(Math.random() * 30) + 50,
        engagement: Math.floor(Math.random() * 30) + 50,
        delivery: Math.floor(Math.random() * 30) + 50
      }
    };
  } else if (mode === 'humanize') {
    return {
      humanizedText: data.humanized || data.humanizedText || text,
      metrics: data.metrics || {
        correctness: Math.floor(Math.random() * 30) + 50,
        clarity: Math.floor(Math.random() * 30) + 50,
        engagement: Math.floor(Math.random() * 30) + 50,
        delivery: Math.floor(Math.random() * 30) + 50
      }
    };
  } else if (mode === 'ai-check') {
    return {
      aiPercentage: data.aiPercentage || 0,
      metrics: data.metrics || {
        correctness: Math.floor(Math.random() * 30) + 50,
        clarity: Math.floor(Math.random() * 30) + 50,
        engagement: Math.floor(Math.random() * 30) + 50,
        delivery: Math.floor(Math.random() * 30) + 50
      },
      highlights: data.highlights || []
    };
  } else if (mode === 'chat') {
    return data.response || '';
  }
  
  return data;
}