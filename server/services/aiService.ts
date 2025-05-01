/**
 * AI Service that integrates with language models
 * Uses Perplexity API (with Llama 4 model) for powerful AI capabilities
 */
import {
  GrammarResult,
  ParaphraseResult,
  HumanizedResult,
  AICheckResult,
  GenerateWritingResult,
  GenerateWritingParams
} from './aiServiceTypes';

// Import our primary Perplexity-based service
import * as perplexityService from './perplexityService';

// Import fallback mock service for when API is unavailable
import * as mockService from './mockAiService';

// Check if we have API credentials
const hasPerplexityCredentials = !!process.env.PERPLEXITY_API_KEY;

// If no credentials, log warning
if (!hasPerplexityCredentials) {
  console.warn('PERPLEXITY_API_KEY is not set. Using mock AI service.');
}

// Export the implementations based on available credentials
// This layer of indirection allows us to easily swap implementations
export const generateGrammarCheck = hasPerplexityCredentials 
  ? perplexityService.generateGrammarCheck 
  : mockService.generateGrammarCheck;

export const generateParaphrase = hasPerplexityCredentials 
  ? perplexityService.generateParaphrase 
  : mockService.generateParaphrase;

export const generateHumanized = hasPerplexityCredentials 
  ? perplexityService.generateHumanized 
  : mockService.generateHumanized;

export const checkAIContent = hasPerplexityCredentials 
  ? perplexityService.checkAIContent 
  : mockService.checkAIContent;

export const generateWriting = hasPerplexityCredentials 
  ? perplexityService.generateWriting 
  : mockService.generateWriting;

export const generateChatResponse = hasPerplexityCredentials 
  ? perplexityService.generateChatResponse 
  : mockService.generateChatResponse;
