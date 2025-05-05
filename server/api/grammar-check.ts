import { detectGrammarErrors } from '../utils/text-processing';
import { generateGrammarCheck } from '../services/aiService';
import { Request, Response } from 'express';
import fetch from 'node-fetch';

export interface GrammarError {
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

export interface GrammarSuggestion {
  id: string;
  type: string;
  originalText: string;
  suggestedText: string;
  description: string;
}

export interface GrammarCheckResult {
  errors: GrammarError[];
  suggestions: GrammarSuggestion[];
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

// Interface for LanguageTool API response
interface LanguageToolResult {
  software?: {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
  };
  language?: {
    name: string;
    code: string;
    detectedLanguage?: {
      name: string;
      code: string;
      confidence: number;
    };
  };
  matches: Array<{
    message: string;
    shortMessage?: string;
    replacements: Array<{
      value: string;
    }>;
    offset: number;
    length: number;
    context: {
      text: string;
      offset: number;
      length: number;
    };
    rule: {
      id: string;
      description: string;
      issueType: string;
      category: {
        id: string;
        name: string;
      };
    };
  }>;
}

/**
 * Use LanguageTool API for grammar checking (free public API)
 */
async function checkWithLanguageTool(text: string, language: string = 'en-US'): Promise<GrammarCheckResult | null> {
  try {
    console.log(`Using LanguageTool API for grammar check with language: ${language}`);
    const response = await fetch('https://api.languagetoolplus.com/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        language,
        enabledOnly: 'false',
      }),
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as LanguageToolResult;
    
    // Convert LanguageTool format to our format
    const errors: GrammarError[] = data.matches.map((match, index) => {
      return {
        id: `lt-${match.rule.id}-${index}`,
        type: match.rule.category.id || 'grammar',
        errorText: text.slice(match.offset, match.offset + match.length),
        replacementText: match.replacements.length > 0 ? match.replacements[0].value : text.slice(match.offset, match.offset + match.length),
        description: match.message,
        position: {
          start: match.offset,
          end: match.offset + match.length
        }
      };
    });
    
    // Generate suggestions based on errors
    const suggestions: GrammarSuggestion[] = errors.map(error => {
      return {
        id: `sugg-${error.id}`,
        type: error.type,
        originalText: error.errorText,
        suggestedText: error.replacementText,
        description: error.description
      };
    });
    
    // Calculate metrics based on number and types of errors
    const errorCount = errors.length;
    const metrics = {
      correctness: Math.max(20, 100 - (errorCount * 5)),
      clarity: Math.max(40, 90 - (errorCount * 3)),
      engagement: Math.max(50, 85 - (errorCount * 2)),
      delivery: Math.max(50, 90 - (errorCount * 3))
    };
    
    return {
      errors,
      suggestions,
      metrics
    };
  } catch (error) {
    console.error('LanguageTool API error:', error);
    return null;
  }
}

/**
 * Enhance local detection with specific patterns like 'I is' -> 'I am' and lowercase 'i' -> 'I'
 */
function enhanceLocalDetection(text: string): GrammarError[] {
  const errors: GrammarError[] = [];
  
  // Check for lowercase "i" as a standalone pronoun
  const lowercaseIPattern = /(\s|^)i(\s|$|\.|,|;|:|\?|!)/g;
  let match;
  while ((match = lowercaseIPattern.exec(text)) !== null) {
    const errorStart = match.index + match[1].length;
    const errorEnd = errorStart + 1;
    
    errors.push({
      id: `cap-${errorStart}`,
      type: "capitalization",
      errorText: "i",
      replacementText: "I",
      description: "The pronoun 'I' should always be capitalized.",
      position: {
        start: errorStart,
        end: errorEnd
      }
    });
  }
  
  // Check for "I is" subject-verb agreement errors
  const subjectVerbAgreementPattern = /(\s|^)I\s+is(\s|$|\.|,|;|:|\?|!)/g;
  let svMatch;
  while ((svMatch = subjectVerbAgreementPattern.exec(text)) !== null) {
    const errorStart = svMatch.index + svMatch[1].length;
    const errorEnd = errorStart + 4; // 'I is'
    
    errors.push({
      id: `sva-${errorStart}`,
      type: "grammar",
      errorText: "I is",
      replacementText: "I am",
      description: "Subject-verb agreement error. The first-person singular pronoun 'I' should be followed by 'am', not 'is'.",
      position: {
        start: errorStart,
        end: errorEnd
      }
    });
  }
  
  return errors;
}

/**
 * Main grammar check function that uses multiple services
 */
export async function checkGrammar(text: string): Promise<GrammarCheckResult> {
  try {
    // Validate input
    if (!text || typeof text !== 'string') {
      return {
        errors: [],
        suggestions: [],
        metrics: {
          correctness: 100,
          clarity: 90,
          engagement: 85,
          delivery: 90
        }
      };
    }
    
    // First, use enhanced local detection for common errors
    const enhancedErrors = enhanceLocalDetection(text);
    
    // Use Gemini API as primary method for grammar checking
    console.log("Using Gemini API for primary grammar check");
    const geminiResult = await generateGrammarCheck(text);
    
    // Check if Gemini result has the expected properties
    if (geminiResult && 
        (geminiResult as any).errors && 
        (geminiResult as any).suggestions && 
        (geminiResult as any).metrics) {
      
      // Type assertion to work with the result
      const typedResult = geminiResult as any;
      
      // Merge with enhanced errors to make sure we catch common issues
      return {
        errors: [...enhancedErrors, ...typedResult.errors],
        suggestions: [
          ...enhancedErrors.map(error => ({
            id: `sugg-${error.id}`,
            type: error.type,
            originalText: error.errorText,
            suggestedText: error.replacementText,
            description: error.description
          })),
          ...typedResult.suggestions
        ],
        metrics: typedResult.metrics
      };
    }
    
    // If Gemini fails, try LanguageTool API as a backup
    const languageToolResult = await checkWithLanguageTool(text);
    
    if (languageToolResult && languageToolResult.errors.length > 0) {
      console.log("Grammar check completed via LanguageTool API (fallback)");
      // Merge with enhanced errors
      return {
        ...languageToolResult,
        errors: [...enhancedErrors, ...languageToolResult.errors],
        suggestions: [
          ...enhancedErrors.map(error => ({
            id: `sugg-${error.id}`,
            type: error.type,
            originalText: error.errorText,
            suggestedText: error.replacementText,
            description: error.description
          })),
          ...languageToolResult.suggestions
        ]
      };
    }
    
    // If all external services fail, use local detection as final fallback
    const detectedErrors = detectGrammarErrors(text).map((error, index) => ({
      id: `local-${index}`,
      type: error.type,
      errorText: text.substring(error.start, error.end),
      replacementText: text.substring(error.start, error.end), // No replacement suggestion in basic detection
      description: `Possible ${error.type} error`,
      position: {
        start: error.start,
        end: error.end
      }
    }));
    
    // Return local detection results
    return {
      errors: [...enhancedErrors, ...detectedErrors],
      suggestions: [
        ...enhancedErrors.map(error => ({
          id: `sugg-${error.id}`,
          type: error.type,
          originalText: error.errorText,
          suggestedText: error.replacementText,
          description: error.description
        })),
        ...detectedErrors.map(error => ({
          id: `sugg-${error.id}`,
          type: error.type,
          originalText: error.errorText,
          suggestedText: error.replacementText,
          description: error.description
        }))
      ],
      metrics: {
        correctness: Math.max(30, 85 - ((enhancedErrors.length + detectedErrors.length) * 5)),
        clarity: 80,
        engagement: 75,
        delivery: 70
      }
    };
  } catch (error) {
    console.error("Error in grammar check:", error);
    throw error;
  }
}

/**
 * API endpoint for grammar check
 */
export async function grammarCheckHandler(req: Request, res: Response) {
  try {
    const { text, language = 'en-US' } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }
    
    // Perform grammar check
    const result = await checkGrammar(text);
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Grammar check handler error:', error);
    res.status(500).json({ error: 'Failed to check grammar' });
  }
}
