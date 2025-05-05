/**
 * AI Service that integrates with language models
 * Uses Google's Gemini API for powerful AI capabilities
 * Uses ZeroGPT API for AI content detection
 */

import { 
  generateGrammarCheck as geminiGrammarCheck,
  generateParaphrase as geminiParaphrase,
  generateParaphraseWithStreaming as geminiParaphraseWithStreaming,
  generateHumanized as geminiHumanize,
  generateHumanizedWithStreaming as geminiHumanizedWithStreaming,
  generateWriting as geminiWriting,
  generateChatResponse as geminiChatResponse,
  detectAiContent as geminiDetectAi,
  hasGeminiCredentials
} from './geminiService';

// Environment variables
const ZEROGPT_API_KEY = process.env.ZEROGPT_API_KEY;
const hasZeroGptCredentials = !!ZEROGPT_API_KEY;

/**
 * Create mock responses for development when API keys are not available
 */
function createMockResponse(message: string) {
  console.warn(`Using mock AI response: ${message}`);
  return {
    corrected: 'This is a mock corrected text. The API key is not available.',
    highlights: [],
    suggestions: [],
    metrics: {
      correctness: 70,
      clarity: 75,
      engagement: 80,
      delivery: 78
    }
  };
}

/**
 * Grammar checking service
 * Uses Gemini API to check grammar and improve text
 */
export const generateGrammarCheck = hasGeminiCredentials
  ? async (text: string) => {
    const result = await geminiGrammarCheck(text);
    
    // Convert to expected interface format for the frontend
    return {
      corrected: text, // Original text, corrections are applied client-side
      highlights: result.errors.map(error => ({
        type: error.type,
        start: error.position.start,
        end: error.position.end,
        suggestion: error.replacementText,
        message: error.description
      })),
      suggestions: result.suggestions.map(suggestion => ({
        id: suggestion.id,
        type: suggestion.type,
        text: suggestion.originalText,
        replacement: suggestion.suggestedText,
        description: suggestion.description
      })),
      metrics: result.metrics
    };
  }
  : () => createMockResponse('Grammar check API is not available');

/**
 * Paraphrasing service
 * Uses Gemini API to rewrite text while preserving meaning
 */
export const generateParaphrase = hasGeminiCredentials
  ? async (text: string, style: string = 'standard', customTone?: string) => {
    const result = await geminiParaphrase(text, style, customTone);
    
    return {
      paraphrased: result.paraphrased,
      metrics: result.metrics
    };
  }
  : () => ({ 
    paraphrased: 'This is a mock paraphrased text. The API key is not available.',
    metrics: {
      correctness: 70,
      clarity: 75,
      engagement: 80,
      delivery: 78
    }
  });

/**
 * Streaming paraphrasing service
 * Uses Gemini API to rewrite text while preserving meaning, with streaming updates
 */
export const generateParaphraseWithStreaming = hasGeminiCredentials
  ? async (text: string, onChunk: (text: string) => void, style: string = 'standard', customTone?: string) => {
    try {
      console.log('Sending text to Gemini for streaming paraphrase');
      // Import here to avoid circular dependencies
      const result = await geminiParaphraseWithStreaming(text, onChunk, style, customTone);
      return result;
    } catch (error: any) {
      console.error('Error in streaming paraphrase:', error);
      const errorMessage = 'I apologize, but I encountered an error while processing your request. Please try again.';
      onChunk(errorMessage);
      return {
        paraphrased: errorMessage,
        metrics: {
          correctness: 0,
          clarity: 0,
          engagement: 0,
          delivery: 0
        }
      };
    }
  }
  : (text: string, onChunk: (text: string) => void) => {
    const mockResponse = 'This is a mock paraphrased text. The API key is not available.';
    onChunk(mockResponse);
    return {
      paraphrased: mockResponse,
      metrics: {
        correctness: 70,
        clarity: 75,
        engagement: 80,
        delivery: 78
      }
    };
  };

/**
 * Humanizing service
 * Uses Gemini API to make AI text sound more human
 */
export const generateHumanized = hasGeminiCredentials
  ? async (text: string, style: string = 'standard', customTone?: string) => {
    const result = await geminiHumanize(text, style, customTone);
    
    return {
      humanizedText: result.humanizedText,
      metrics: result.metrics
    };
  }
  : () => ({ 
    humanizedText: 'This is a mock humanized text. The API key is not available.',
    metrics: {
      correctness: 70,
      clarity: 75,
      engagement: 80,
      delivery: 78
    }
  });

/**
 * Streaming humanizing service
 * Uses Gemini API to make AI text sound more human, with streaming updates
 */
export const generateHumanizedWithStreaming = hasGeminiCredentials
  ? async (text: string, onChunk: (text: string) => void, style: string = 'standard', customTone?: string) => {
    try {
      console.log('Sending text to Gemini for streaming humanization');
      // Import here to avoid circular dependencies
      const result = await geminiHumanizedWithStreaming(text, onChunk, style, customTone);
      return result;
    } catch (error: any) {
      console.error('Error in streaming humanize:', error);
      const errorMessage = 'I apologize, but I encountered an error while processing your request. Please try again.';
      onChunk(errorMessage);
      return {
        humanizedText: errorMessage,
        metrics: {
          correctness: 0,
          clarity: 0,
          engagement: 0,
          delivery: 0
        }
      };
    }
  }
  : (text: string, onChunk: (text: string) => void) => {
    const mockResponse = 'This is a mock humanized text. The API key is not available.';
    onChunk(mockResponse);
    return {
      humanizedText: mockResponse,
      metrics: {
        correctness: 70,
        clarity: 75,
        engagement: 80,
        delivery: 78
      }
    };
  };

/**
 * Mock AI check response for development
 */
function createMockAICheckResponse(text: string) {
  console.warn('Using mock AI check response');
  const aiPercentage = Math.floor(Math.random() * 100);
  const isAI = aiPercentage >= 50;
  
  return {
    aiAnalyzed: text,
    aiPercentage,
    verdict: isAI ? 'AI-generated' : 'Human-written',
    confidence: aiPercentage / 100,
    reasons: [
      isAI ? 'Consistent tone throughout the text' : 'Varied tone and natural language patterns',
      isAI ? 'Lack of personal voice or anecdotes' : 'Contains personal perspective',
      isAI ? 'Too perfect sentence structure and grammar' : 'Natural sentence variety'
    ],
    highlights: [
      {
        id: 'mock-1',
        type: 'ai',
        start: 0,
        end: Math.min(text.length, 20),
        message: 'This section has patterns typical of AI writing.'
      }
    ],
    suggestions: [
      {
        id: 'mock-sugg-1',
        type: 'ai',
        text: text.substring(0, Math.min(text.length, 20)),
        replacement: 'Try rewriting this part to sound more human.',
        description: 'This text has characteristics of AI-generated content.'
      }
    ],
    metrics: {
      correctness: 75,
      clarity: 70,
      engagement: 65,
      delivery: 70
    }
  };
}

/**
 * AI Content Detection
 * Uses ZeroGPT API with fallback to Gemini
 */
export const checkAIContent = async (text: string) => {
  try {
    if (hasZeroGptCredentials) {
      // Try ZeroGPT API first
      console.log('Using ZeroGPT API for AI detection');
      
      const response = await fetch('https://api.zerogpt.com/api/detect/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZEROGPT_API_KEY}`
        },
        body: JSON.stringify({
          input_text: text
        })
      });
      
      if (!response.ok) {
        throw new Error(`ZeroGPT API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('ZeroGPT response:', data);
      
      if (data && typeof data.ai_probability === 'number') {
        // Convert ZeroGPT response to our format
        const aiPercentage = Math.round(data.ai_probability * 100);
        
        // ZeroGPT doesn't provide detailed highlights, so we'll create some based on the score
        const highlights = [];
        const suggestions = [];
        
        if (aiPercentage > 50) {
          // Only add highlights if the AI probability is significant
          const sentenceBreak = /[.!?]+\s+/g;
          const sentences = text.split(sentenceBreak);
          
          let startPos = 0;
          for (let i = 0; i < Math.min(3, sentences.length); i++) {
            const sentenceLength = sentences[i].length + 2; // +2 for the punctuation and space
            
            highlights.push({
              id: `aigpt-${i}`,
              type: 'ai',
              start: startPos,
              end: startPos + sentenceLength,
              message: 'This sentence has characteristics of AI-generated text.'
            });
            
            suggestions.push({
              id: `sugg-aigpt-${i}`,
              type: 'ai',
              text: sentences[i],
              replacement: 'Consider rewriting this sentence to sound more human.',
              description: 'This text has patterns typical of AI writing.'
            });
            
            startPos += sentenceLength;
          }
        }
        
        return {
          aiAnalyzed: text,
          aiPercentage,
          verdict: aiPercentage >= 50 ? 'AI-generated' : 'Human-written',
          confidence: data.ai_probability,
          reasons: aiPercentage >= 50 ? 
            ['Patterns consistent with AI-generated text', 'Statistical language patterns match AI models', 'Lack of human writing variance'] :
            ['Natural language patterns', 'Statistical variance consistent with human writing', 'Unpredictable sentence structures'],
          highlights,
          suggestions,
          metrics: {
            correctness: 75,
            clarity: 75,
            engagement: 75,
            delivery: 75
          }
        };
      }
    }
    
    // Fall back to Gemini if ZeroGPT fails or is not available
    if (hasGeminiCredentials) {
      console.log('Using Gemini for AI detection (fallback)');
      const result = await geminiDetectAi(text);
      
      return {
        aiAnalyzed: text,
        aiPercentage: result.aiPercentage,
        verdict: result.verdict || (result.aiPercentage >= 50 ? 'AI-generated' : 'Human-written'),
        confidence: result.confidence || (result.aiPercentage / 100),
        reasons: result.reasons || ['AI patterns detected in the text'],
        highlights: result.highlights.map(highlight => ({
          id: highlight.id,
          type: 'ai',
          start: highlight.position?.start || 0,
          end: highlight.position?.end || 0,
          message: highlight.message
        })),
        suggestions: result.highlights.map((highlight, index) => ({
          id: `sugg-${highlight.id || index}`,
          type: 'ai',
          text: text.substring(highlight.position?.start || 0, highlight.position?.end || text.length),
          replacement: 'Consider rewriting this section to sound more human.',
          description: highlight.message || 'This text has patterns typical of AI writing.'
        })),
        metrics: result.metrics
      };
    }
    
    // If no API is available, return a mock response
    return createMockAICheckResponse(text);
  } catch (error: any) {
    console.error('Error in AI content detection:', error);
    
    // If Gemini is available, try it as a backup
    if (hasGeminiCredentials) {
      try {
        console.log('Using Gemini for AI detection (after error)');
        const result = await geminiDetectAi(text);
        
        return {
          aiAnalyzed: text,
          aiPercentage: result.aiPercentage,
          verdict: result.verdict || (result.aiPercentage >= 50 ? 'AI-generated' : 'Human-written'),
          confidence: result.confidence || (result.aiPercentage / 100),
          reasons: result.reasons || ['AI patterns detected in the text'],
          highlights: result.highlights.map(highlight => ({
            id: highlight.id,
            type: 'ai',
            start: highlight.position?.start || 0,
            end: highlight.position?.end || 0,
            message: highlight.message
          })),
          suggestions: result.highlights.map((highlight, index) => ({
            id: `sugg-${highlight.id || index}`,
            type: 'ai',
            text: text.substring(highlight.position?.start || 0, highlight.position?.end || text.length),
            replacement: 'Consider rewriting this section to sound more human.',
            description: highlight.message || 'This text has patterns typical of AI writing.'
          })),
          metrics: result.metrics
        };
      } catch {
        // If all else fails, return a mock response
        return createMockAICheckResponse(text);
      }
    }
    
    // If no API is available, return a mock response
    return createMockAICheckResponse(text);
  }
};

/**
 * Content generation
 * Uses Gemini API to generate writing
 */
export const generateWriting = hasGeminiCredentials
  ? async (params: {
    originalSample: string;
    referenceUrl?: string;
    topic: string;
    length?: string;
    style?: string;
    additionalInstructions?: string;
  }) => {
    const result = await geminiWriting(params);
    return result;
  }
  : () => ({ 
    generatedText: 'This is mock generated text. The API key is not available.'
  });

/**
 * Chat response generation
 * Uses Gemini API for conversational responses
 */
export const generateChatResponse = hasGeminiCredentials
  ? async (messages: any[]) => {
    try {
      console.log('Sending sanitized messages to Gemini:', JSON.stringify(messages));
      const response = await geminiChatResponse(messages);
      return response;
    } catch (error: any) {
      console.error('Error in chat response:', error);
      return 'I apologize, but I encountered an error while processing your request. Please try again.';
    }
  }
  : () => 'This is a mock chat response. The API key is not available.';

/**
 * Streaming chat response generation
 * Uses Gemini API for streaming conversational responses
 */
export const generateChatResponseWithStreaming = hasGeminiCredentials
  ? async (messages: any[], onChunk: (text: string) => void) => {
    try {
      console.log('Sending sanitized messages to Gemini with streaming');
      // Import here to avoid circular dependencies
      const { generateChatResponseWithStreaming } = await import('./geminiService');
      const response = await generateChatResponseWithStreaming(messages, onChunk);
      return response;
    } catch (error: any) {
      console.error('Error in streaming chat response:', error);
      const errorMessage = 'I apologize, but I encountered an error while processing your request. Please try again.';
      onChunk(errorMessage);
      return errorMessage;
    }
  }
  : (messages: any[], onChunk: (text: string) => void) => {
    const mockResponse = 'This is a mock chat response. The API key is not available.';
    onChunk(mockResponse);
    return mockResponse;
  };