import { generateGeminiResponse } from '../utils/gemini-api';
import { detectAIMarkers } from '../utils/text-processing';

interface AIHighlight {
  id: string;
  position: {
    start: number;
    end: number;
  };
}

interface AISuggestion {
  id: string;
  type: string;
  originalText: string;
  suggestedText: string;
  description: string;
}

interface AICheckResult {
  aiPercentage: number;
  highlights: AIHighlight[];
  suggestions: AISuggestion[];
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export async function checkAIContent(text: string): Promise<AICheckResult> {
  try {
    // First, use the local utility to detect common AI markers
    const { score: localScore, markers: localMarkers } = detectAIMarkers(text);
    
    // Then, use Gemini API for a more thorough analysis
    const prompt = `
      Analyze the following text to determine if it's likely AI-generated.
      Identify specific patterns, phrasings, or structural elements that are typical of AI writing.
      Suggest changes to make the text appear more human-written.
      
      Text to analyze: "${text}"
      
      Format your response as JSON with the following structure:
      {
        "aiPercentage": percentage_of_AI_likelihood_0_to_100,
        "highlights": [
          {
            "id": "unique-identifier",
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
            "description": "brief explanation of why this sounds AI-generated"
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
    
    // Combine local detection with AI analysis or use fallback
    if (parsedResponse && 
        typeof parsedResponse.aiPercentage === 'number' && 
        parsedResponse.highlights && 
        parsedResponse.suggestions && 
        parsedResponse.metrics) {
      return parsedResponse as AICheckResult;
    } else {
      // Fallback to local detection
      return {
        aiPercentage: localScore,
        highlights: localMarkers.map((marker, index) => ({
          id: `local-${index}`,
          position: {
            start: marker.start,
            end: marker.end
          }
        })),
        suggestions: localMarkers.map((marker, index) => ({
          id: `local-${index}`,
          type: "ai-pattern",
          originalText: text.substring(marker.start, marker.end),
          suggestedText: text.substring(marker.start, marker.end).replace(/furthermore|moreover|additionally/i, "also").replace(/it is (worth noting|important|essential)/i, "notably"),
          description: "This phrasing is common in AI-generated text"
        })),
        metrics: {
          correctness: 90,
          clarity: 85,
          engagement: 70,
          delivery: 75
        }
      };
    }
  } catch (error) {
    console.error("Error in AI content check:", error);
    throw error;
  }
}
