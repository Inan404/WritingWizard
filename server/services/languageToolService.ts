/**
 * LanguageTool API Service
 * Provides grammar and style checking capabilities
 */
import fetch from 'node-fetch';

interface LanguageToolMatch {
  message: string;
  shortMessage?: string;
  replacements: { value: string }[];
  offset: number;
  length: number;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  sentence: string;
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: {
      id: string;
      name: string;
    };
  };
}

interface LanguageToolResponse {
  software: {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
    status: string;
    premium: boolean;
  };
  warnings: {
    incompleteResults: boolean;
  };
  language: {
    name: string;
    code: string;
    detectedLanguage: {
      name: string;
      code: string;
      confidence: number;
    };
  };
  matches: LanguageToolMatch[];
}

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
  correctedText: string;
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
 * Checks text for grammar and style issues using LanguageTool API
 * @param text The text to check
 * @param language The language code (e.g., 'en-US', 'auto' for auto-detection)
 * @returns Grammar check results with errors, suggestions, and metrics
 */
export async function checkGrammarWithLanguageTool(
  text: string,
  language: string = 'en-US'
): Promise<GrammarCheckResult> {
  try {
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', language);
    params.append('enabledOnly', 'false');
    
    // Optional: Add API key if you have one
    // params.append('username', process.env.LANGUAGETOOL_USERNAME || '');
    // params.append('apiKey', process.env.LANGUAGETOOL_API_KEY || '');
    
    const response = await fetch('https://api.languagetoolplus.com/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LanguageTool API error:', errorText);
      throw new Error(`LanguageTool API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as LanguageToolResponse;
    return processLanguageToolResponse(text, data);
  } catch (error) {
    console.error('Error checking grammar with LanguageTool:', error);
    throw error;
  }
}

/**
 * Process the LanguageTool API response and convert it to our application format
 */
function processLanguageToolResponse(
  originalText: string,
  response: LanguageToolResponse
): GrammarCheckResult {
  const errors: GrammarError[] = [];
  const suggestions: GrammarSuggestion[] = [];
  
  // Process matches from LanguageTool
  for (const match of response.matches) {
    const replacement = match.replacements.length > 0 
      ? match.replacements[0].value 
      : '';
      
    const errorText = originalText.substring(match.offset, match.offset + match.length);
    
    // Determine if this is an error or suggestion based on the rule category
    const category = match.rule.category.id.toLowerCase();
    const isStyleSuggestion = 
      category.includes('style') || 
      category.includes('redundancy') || 
      category.includes('clarity') ||
      category.includes('readability');
    
    if (isStyleSuggestion) {
      // This is a style suggestion
      suggestions.push({
        id: `lt-${match.rule.id}-${match.offset}`,
        type: match.rule.category.name.toLowerCase(),
        originalText: errorText,
        suggestedText: replacement,
        description: match.message,
      });
    } else {
      // This is a grammar error
      errors.push({
        id: `lt-${match.rule.id}-${match.offset}`,
        type: match.rule.category.name.toLowerCase(),
        errorText: errorText,
        replacementText: replacement,
        description: match.message,
        position: {
          start: match.offset,
          end: match.offset + match.length,
        },
      });
    }
  }
  
  // Calculate metrics based on number and type of issues
  const totalIssues = errors.length + suggestions.length;
  const errorWeight = errors.length * 2; // Errors count twice as much as suggestions
  
  // Calculate correctness as inverse of weighted issues
  const correctnessBase = Math.max(0, 100 - (totalIssues * 5));
  const correctness = Math.max(20, Math.min(95, correctnessBase));
  
  // Other metrics are estimated relative to correctness
  const clarity = Math.max(30, Math.min(95, correctness + (Math.random() * 10 - 5)));
  const engagement = Math.max(40, Math.min(95, correctness - 5 + (Math.random() * 15)));
  const delivery = Math.max(40, Math.min(95, (correctness + clarity) / 2 + (Math.random() * 10 - 5)));
  
  return {
    correctedText: originalText, // We don't auto-correct the text
    errors,
    suggestions,
    metrics: {
      correctness,
      clarity,
      engagement,
      delivery,
    }
  };
}