import { generateGeminiResponse } from '../utils/gemini-api';
import { detectGrammarErrors } from '../utils/text-processing';

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
    
    // Then, use Gemini API for a more thorough analysis
    const prompt = `
      Analyze the following text for grammar errors, provide detailed suggestions, and evaluate the writing.
      Identify specific grammar issues, suggest corrections, and classify each error by type.
      Also provide metrics for correctness, clarity, engagement, and delivery on a scale of 0-100.
      
      Text to analyze: "${text}"
      
      Format your response as JSON with the following structure:
      {
        "errors": [
          {
            "id": "unique-identifier",
            "type": "error-type",
            "errorText": "text with the error",
            "replacementText": "suggested replacement",
            "description": "brief explanation",
            "position": {
              "start": start_index_in_original_text,
              "end": end_index_in_original_text
            }
          }
        ],
        "suggestions": [
          {
            "id": "unique-identifier",
            "type": "suggestion-type",
            "originalText": "original text",
            "suggestedText": "suggested replacement",
            "description": "brief explanation of this suggestion"
          }
        ],
        "metrics": {
          "correctness": score_0_to_100,
          "clarity": score_0_to_100,
          "engagement": score_0_to_100,
          "delivery": score_0_to_100
        }
      }
    `;

    const response = await generateGeminiResponse(prompt);
    
    // Parse JSON from the response
    // Since Gemini might return text with markdown code blocks, we need to extract the JSON
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                      response.match(/```\s*([\s\S]*?)\s*```/) ||
                      response.match(/({[\s\S]*})/);
                      
    let parsedResponse;
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedResponse = JSON.parse(jsonMatch[1].trim());
      } catch (e) {
        console.error("Failed to parse JSON from Gemini response", e);
        parsedResponse = null;
      }
    }
    
    // Combine detected errors with AI analysis or use fallback
    if (parsedResponse && 
        parsedResponse.errors && 
        parsedResponse.suggestions && 
        parsedResponse.metrics) {
      return parsedResponse as GrammarCheckResult;
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
