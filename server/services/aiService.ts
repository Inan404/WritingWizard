/**
 * AI Service that integrates with language models
 * Uses Perplexity API (with Llama 4 model) for powerful AI capabilities
 * Uses ZeroGPT API for AI content detection
 */

import {
  generateGrammarCheck as perplexityGrammarCheck,
  generateParaphrase as perplexityParaphrase,
  generateHumanized as perplexityHumanize,
  generateChatResponse as perplexityChatResponse,
  hasPerplexityCredentials
} from './perplexityService';

import {
  detectAiContent,
  hasZeroGptCredentials
} from './zeroGptService';

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

// Create mock AI check response for development
function createMockAICheckResponse(text: string) {
  return {
    aiPercentage: 35, // Mock AI percentage
    highlights: [
      {
        id: 'mock-highlight-1',
        position: {
          start: 0,
          end: Math.min(50, text.length)
        }
      }
    ],
    suggestions: [],
    metrics: {
      correctness: 65,
      clarity: 70,
      engagement: 75,
      delivery: 70
    }
  };
}

// AI check handler - Uses ZeroGPT API if available, falls back to Perplexity
export const checkAIContent = async (text: string) => {
  if (hasZeroGptCredentials) {
    try {
      console.log('Using ZeroGPT API for AI detection');
      return await detectAiContent(text);
    } catch (error) {
      console.error('ZeroGPT API error:', error);
      // If ZeroGPT fails, fall back to mock response for now
      if (!hasPerplexityCredentials) {
        console.warn('Falling back to mock AI check response');
        return createMockAICheckResponse(text);
      }
    }
  } else if (!hasPerplexityCredentials) {
    console.warn('No AI detection APIs available, using mock response');
    return createMockAICheckResponse(text);
  }
  
  // If ZeroGPT is not available or failed, use Perplexity as fallback
  try {
    console.log('Using Perplexity API for AI detection fallback');
    // Structured prompt for AI detection
    const prompt = `
Analyze this text and determine if it was written by AI or a human.
Provide your analysis as a percentage (0-100) where 100% means definitely AI-generated.
Respond ONLY with this percentage without any explanation.

Text to analyze:
"${text}"
    `;
    
    const response = await perplexityChatResponse([
      {
        role: 'system',
        content: 'You are an AI content detector. Analyze text and determine the probability it was written by AI. Respond ONLY with a percentage (0-100).'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
    
    // Extract percentage from response
    const percentMatch = response.match(/(\d+)/);
    const aiPercentage = percentMatch ? Math.min(100, Math.max(0, parseInt(percentMatch[1], 10))) : 50;
    
    // Generate basic highlights
    const highlights = [];
    if (aiPercentage > 30) {
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const numHighlights = Math.min(3, sentences.length);
      
      for (let i = 0; i < numHighlights; i++) {
        const sentenceIndex = Math.floor(i * sentences.length / numHighlights);
        const sentence = sentences[sentenceIndex];
        const start = text.indexOf(sentence);
        
        if (start >= 0) {
          highlights.push({
            id: `highlight-${i}`,
            position: {
              start,
              end: start + sentence.length
            }
          });
        }
      }
    }
    
    return {
      aiPercentage,
      highlights,
      suggestions: [],
      metrics: {
        correctness: Math.max(50, 100 - aiPercentage),
        clarity: 70,
        engagement: 70,
        delivery: 70
      }
    };
  } catch (error) {
    console.error('Perplexity API error for AI detection:', error);
    return createMockAICheckResponse(text);
  }
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