/**
 * AI Service that integrates with language models
 * Uses Perplexity API (with Llama 4 model) for powerful AI capabilities
 */

import {
  generateGrammarCheck as perplexityGrammarCheck,
  generateParaphrase as perplexityParaphrase,
  generateHumanized as perplexityHumanize,
  generateChatResponse as perplexityChatResponse,
  hasPerplexityCredentials
} from './perplexityService';

// Function to create mock AI response when no API key is available
function createMockResponse(message: string) {
  return {
    error: "API key not available",
    message: message
  };
}

// Grammar check handler - uses Perplexity API if available
export const generateGrammarCheck = hasPerplexityCredentials
  ? perplexityGrammarCheck
  : async () => createMockResponse("Grammar check requires Perplexity API key");

// Paraphrase handler - uses Perplexity API if available
export const generateParaphrase = hasPerplexityCredentials
  ? perplexityParaphrase
  : async () => createMockResponse("Paraphrasing requires Perplexity API key");

// Humanize handler - uses Perplexity API if available
export const generateHumanized = hasPerplexityCredentials
  ? perplexityHumanize
  : async () => createMockResponse("Humanizing requires Perplexity API key");

// AI check handler - Needs ZeroGPT API, not implemented yet
export const checkAIContent = async (text: string) => {
  return {
    aiAnalyzed: text,
    aiPercentage: 0, // Will be implemented with ZeroGPT later
    highlights: [],
    suggestions: [],
    metrics: {
      correctness: 0,
      clarity: 0,
      engagement: 0,
      delivery: 0
    }
  };
};

// Generate writing handler - uses Perplexity API if available
export const generateWriting = hasPerplexityCredentials
  ? async (params: {
      originalSample: string;
      referenceUrl?: string;
      topic: string;
      length?: string;
      style?: string;
      additionalInstructions?: string;
    }) => {
      // Create a detailed prompt for the language model
      const prompt = `Please write content on the following topic: ${params.topic}
${params.originalSample ? `Here's a sample for reference: ${params.originalSample}` : ''}
${params.referenceUrl ? `Reference URL for information: ${params.referenceUrl}` : ''}
${params.length ? `Length: ${params.length}` : 'Length: Medium (300-500 words)'}
${params.style ? `Style: ${params.style}` : 'Style: Informative and engaging'}
${params.additionalInstructions ? `Additional instructions: ${params.additionalInstructions}` : ''}`;

      // Use the chat response function with our detailed prompt
      const generatedText = await perplexityChatResponse([
        {
          role: 'system',
          content: 'You are an expert content writer. Write high-quality, engaging content based on the user\'s requirements.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]);

      return { generatedText };
    }
  : async () => ({ generatedText: "Content generation requires Perplexity API key" });

// Chat response handler - uses Perplexity API if available
export const generateChatResponse = hasPerplexityCredentials
  ? perplexityChatResponse
  : async () => "Chat functionality requires Perplexity API key. Please add the API key to your environment variables.";