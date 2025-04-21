/**
 * This is a placeholder service for Perplexity API integration,
 * to be replaced with a free alternative or a direct LLM implementation.
 */

import { 
  GrammarResult, 
  ParaphraseResult, 
  HumanizedResult, 
  AICheckResult, 
  GenerateWritingResult, 
  GenerateWritingParams 
} from './aiServiceTypes';

// No need to import mock service since we're re-exporting directly

// For now, we're using the mock service as a placeholder
// until we implement a free alternative or direct LLM integration
// Export the mock functions - the function names in mockAiService are exported directly
export { 
  generateGrammarCheck,
  generateParaphrase,
  generateHumanized,
  checkAIContent,
  generateWriting 
} from './mockAiService';

// Future implementation pattern for when we integrate a real free LLM service:
/*
export async function generateGrammarCheck(text: string): Promise<GrammarResult> {
  // Implementation will go here
  // This will use a free LLM service or local model
}
*/