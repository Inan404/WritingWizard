/**
 * AI Service that uses a free mock implementation
 */
import {
  GrammarResult,
  ParaphraseResult,
  HumanizedResult,
  AICheckResult,
  GenerateWritingResult,
  GenerateWritingParams
} from './aiServiceTypes';

// Import mock service for free implementation
import * as mockService from './mockAiService';

// Export the mock implementations
export const generateGrammarCheck = mockService.generateGrammarCheck;
export const generateParaphrase = mockService.generateParaphrase;
export const generateHumanized = mockService.generateHumanized;
export const checkAIContent = mockService.checkAIContent;
export const generateWriting = mockService.generateWriting;
