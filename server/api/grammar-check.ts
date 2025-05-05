import { generateGrammarCheck } from '../services/aiService';
import { Request, Response } from 'express';

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
  
  // Check for common subject-verb agreement errors
  const commonErrors = [
    {
      pattern: /\b(I|we|you|they)\s+(is|was|has been)\b/gi,
      type: "grammar",
      description: "Subject-verb agreement error. Use 'am/are/have been' with these subjects.",
      fix: (match: string) => {
        const subject = match.split(/\s+/)[0].toLowerCase();
        const verb = match.split(/\s+/)[1].toLowerCase();
        
        if (subject === 'i' && verb === 'is') return match.replace(/\s+is\b/i, ' am');
        if (subject === 'i' && verb === 'was') return match; // "I was" is correct
        if (subject === 'i' && verb === 'has been') return match.replace(/\s+has been\b/i, ' have been');
        
        if ((subject === 'we' || subject === 'you' || subject === 'they') && verb === 'is')
          return match.replace(/\s+is\b/i, ' are');
        if ((subject === 'we' || subject === 'you' || subject === 'they') && verb === 'was')
          return match.replace(/\s+was\b/i, ' were');
        if ((subject === 'we' || subject === 'you' || subject === 'they') && verb === 'has been')
          return match;
          
        return match;
      }
    },
    {
      pattern: /\b(he|she|it)\s+(am|are|have been)\b/gi,
      type: "grammar",
      description: "Subject-verb agreement error. Use 'is/was/has been' with these subjects.",
      fix: (match: string) => {
        const subject = match.split(/\s+/)[0].toLowerCase();
        const verb = match.split(/\s+/)[1].toLowerCase();
        
        if ((subject === 'he' || subject === 'she' || subject === 'it') && verb === 'am')
          return match.replace(/\s+am\b/i, ' is');
        if ((subject === 'he' || subject === 'she' || subject === 'it') && verb === 'are')
          return match.replace(/\s+are\b/i, ' is');
        if ((subject === 'he' || subject === 'she' || subject === 'it') && verb === 'have been')
          return match.replace(/\s+have been\b/i, ' has been');
          
        return match;
      }
    }
  ];
  
  // Process each error pattern
  for (const errorRule of commonErrors) {
    let match;
    while ((match = errorRule.pattern.exec(text)) !== null) {
      const matchText = match[0];
      const fixedText = errorRule.fix(matchText);
      
      if (matchText !== fixedText) {
        errors.push({
          id: `local-${errors.length}`,
          type: errorRule.type,
          errorText: matchText,
          replacementText: fixedText,
          description: errorRule.description,
          position: {
            start: match.index,
            end: match.index + matchText.length
          }
        });
      }
    }
  }
  
  return errors;
}

/**
 * Main grammar check function that uses Gemini API and local detection
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
    
    // Use Gemini API for grammar checking
    console.log("Using Gemini API for grammar check");
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
    
    // If Gemini fails, return at least the local detection results
    if (enhancedErrors.length > 0) {
      const suggestions = enhancedErrors.map(error => ({
        id: `sugg-${error.id}`,
        type: error.type,
        originalText: error.errorText,
        suggestedText: error.replacementText,
        description: error.description
      }));
      
      // Calculate metrics based on number of errors
      const errorCount = enhancedErrors.length;
      const metrics = {
        correctness: Math.max(60, 100 - (errorCount * 5)),
        clarity: Math.max(70, 95 - (errorCount * 3)),
        engagement: Math.max(75, 90 - (errorCount * 2)), 
        delivery: Math.max(75, 95 - (errorCount * 3))
      };
      
      return {
        errors: enhancedErrors,
        suggestions,
        metrics
      };
    }
    
    // Return empty result if nothing works
    return {
      errors: [],
      suggestions: [],
      metrics: {
        correctness: 90,
        clarity: 85,
        engagement: 80,
        delivery: 85
      }
    };
  } catch (error) {
    console.error('Grammar check error:', error);
    
    // Return basic error response
    return {
      errors: [],
      suggestions: [],
      metrics: {
        correctness: 75,
        clarity: 75,
        engagement: 75,
        delivery: 75
      }
    };
  }
}

/**
 * API endpoint for grammar check
 */
export async function grammarCheckHandler(req: Request, res: Response) {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required and must be a string' });
    }
    
    const result = await checkGrammar(text);
    res.json(result);
  } catch (error) {
    console.error('Error in grammar check handler:', error);
    res.status(500).json({ error: 'Failed to check grammar' });
  }
}