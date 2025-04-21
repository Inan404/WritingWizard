/**
 * AI Service that integrates with language models
 * Currently using a mock implementation until we integrate with a free LLM solution
 */
import {
  GrammarResult,
  ParaphraseResult,
  HumanizedResult,
  AICheckResult,
  GenerateWritingResult,
  GenerateWritingParams
} from './aiServiceTypes';

// Use the perplexity service which is currently just a wrapper around the mock service
// In the future, this will be updated to use a real LLM integration
import * as llmService from './perplexityService';

// Export the implementations - this layer of indirection allows us to
// easily swap in different implementations later
export const generateGrammarCheck = llmService.generateGrammarCheck;
export const generateParaphrase = llmService.generateParaphrase;
export const generateHumanized = llmService.generateHumanized;
export const checkAIContent = llmService.checkAIContent;
export const generateWriting = llmService.generateWriting;
