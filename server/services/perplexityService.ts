/**
 * This was previously a placeholder service for Perplexity API integration,
 * it's now replaced with Llama integration via Cloudflare Workers AI.
 */

import { 
  GrammarResult, 
  ParaphraseResult, 
  HumanizedResult, 
  AICheckResult, 
  GenerateWritingResult, 
  GenerateWritingParams 
} from './aiServiceTypes';

// Import our Llama service functions
import {
  generateGrammarCheck as llamaGrammarCheck,
  generateParaphrase as llamaParaphrase,
  generateHumanized as llamaHumanized,
  checkAIContent as llamaCheckAIContent,
  generateWriting as llamaGenerateWriting,
  generateChatResponse as llamaGenerateChatResponse
} from './llamaService';

// Check if we have Cloudflare credentials
const hasCloudflareCredentials = () => {
  return !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
};

// Check if we have Gemini as fallback
const hasGeminiCredentials = () => {
  return !!process.env.GEMINI_API_KEY;
};

// If credentials are missing, log a warning
if (!hasCloudflareCredentials() && !hasGeminiCredentials()) {
  console.warn('Neither Cloudflare AI nor Gemini API credentials are available. Using mock service.');
}

// Export the Llama functions if credentials exist, otherwise fall back to mock service
export const generateGrammarCheck = hasCloudflareCredentials() || hasGeminiCredentials() ? 
  llamaGrammarCheck : 
  require('./mockAiService').generateGrammarCheck;

export const generateParaphrase = hasCloudflareCredentials() || hasGeminiCredentials() ? 
  llamaParaphrase : 
  require('./mockAiService').generateParaphrase;

export const generateHumanized = hasCloudflareCredentials() || hasGeminiCredentials() ? 
  llamaHumanized : 
  require('./mockAiService').generateHumanized;

export const checkAIContent = hasCloudflareCredentials() || hasGeminiCredentials() ? 
  llamaCheckAIContent : 
  require('./mockAiService').checkAIContent;

export const generateWriting = hasCloudflareCredentials() || hasGeminiCredentials() ? 
  llamaGenerateWriting : 
  require('./mockAiService').generateWriting;

// Export the chat function - this is a new addition
export const generateChatResponse = hasCloudflareCredentials() || hasGeminiCredentials() ? 
  llamaGenerateChatResponse : 
  async (messages: {role: string, content: string}[]) => {
    console.warn('Using mock chat service due to missing API credentials');
    return "I'm an AI writing assistant here to help you with your writing needs. How can I assist you today?";
  };