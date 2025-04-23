/**
 * AI Service that integrates with language models
 * Uses Llama model via Cloudflare Workers AI
 */
import {
  GrammarResult,
  ParaphraseResult,
  HumanizedResult,
  AICheckResult,
  GenerateWritingResult,
  GenerateWritingParams
} from './aiServiceTypes';

// Use the perplexity service which now uses Llama via Cloudflare Workers AI
import * as llmService from './perplexityService';

// Export the implementations - this layer of indirection allows us to
// easily swap in different implementations later
export const generateGrammarCheck = llmService.generateGrammarCheck;
export const generateParaphrase = llmService.generateParaphrase;
export const generateHumanized = llmService.generateHumanized;
export const checkAIContent = llmService.checkAIContent;
export const generateWriting = llmService.generateWriting;
export const generateChatResponse = llmService.generateChatResponse;
