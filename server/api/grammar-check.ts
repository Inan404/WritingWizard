import { detectGrammarErrors } from '../utils/text-processing';
import { generateGrammarCheck } from '../services/aiService';

interface GrammarError {
  id: string;
  type: string;
  errorText: string;
  replacementText: string;
  description: string;
  position: {
    start: number;
    end: number;
  };
}

interface GrammarSuggestion {
  id: string;
  type: string;
  originalText: string;
  suggestedText: string;
  description: string;
}

interface GrammarCheckResult {
  errors: GrammarError[];
  suggestions: GrammarSuggestion[];
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export async function checkGrammar(text: string): Promise<GrammarCheckResult> {
  try {
    // First, use the local utility to detect common grammar errors
    const detectedErrors = detectGrammarErrors(text);
    
    // Use Perplexity API for grammar analysis through aiService
    const result = await generateGrammarCheck(text);
    
    // If we get a valid result from Perplexity
    if (result && 
        result.errors && 
        result.suggestions && 
        result.metrics) {
      return result as GrammarCheckResult;
    } else {
      // Fallback response if Gemini API fails to provide proper JSON
      return {
        errors: detectedErrors.map((error, index) => ({
          id: `local-${index}`,
          type: error.type,
          errorText: text.substring(error.start, error.end),
          replacementText: text.substring(error.start, error.end), // No replacement suggestion in basic detection
          description: `Possible ${error.type} error`,
          position: {
            start: error.start,
            end: error.end
          }
        })),
        suggestions: detectedErrors.map((error, index) => ({
          id: `local-${index}`,
          type: error.type,
          originalText: text.substring(error.start, error.end),
          suggestedText: text.substring(error.start, error.end), // No replacement suggestion in basic detection
          description: `Possible ${error.type} error`
        })),
        metrics: {
          correctness: 85 - (detectedErrors.length * 5),
          clarity: 80,
          engagement: 75,
          delivery: 70
        }
      };
    }
  } catch (error) {
    console.error("Error in grammar check:", error);
    throw error;
  }
}
