import { generateGeminiResponse } from '../utils/gemini-api';

interface HumanizeResult {
  humanizedText: string;
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export async function humanizeText(text: string, style: string = 'standard'): Promise<HumanizeResult> {
  try {
    // Map style to specific instructions
    const styleInstructions = {
      standard: "Make the text sound more natural and human-written. Remove AI patterns and formal structures.",
      fluency: "Focus on conversational flow, use contractions, and varied sentence structures.",
      formal: "Keep it professional but with natural human writing patterns. Avoid excessive formality.",
      academic: "Maintain academic tone but with human writing patterns. Add authentic voice.",
      custom: "Add personality, imperfections, and style variations that AI typically doesn't produce."
    };
    
    const selectedStyle = styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.standard;
    
    const prompt = `
      Rewrite the following text to make it sound more human and less like AI-generated content. ${selectedStyle}
      
      Add natural variation, occasional informality where appropriate, and more authentic voice.
      Remove common AI patterns like excessive transitions, perfect parallelism, and overly consistent language.
      
      Text to humanize: "${text}"
      
      Format your response as JSON with the following structure:
      {
        "humanizedText": "the humanized version of the text",
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
    
    if (parsedResponse && 
        parsedResponse.humanizedText && 
        parsedResponse.metrics) {
      return parsedResponse as HumanizeResult;
    } else {
      // Extract text if JSON parsing failed
      const humanizedText = response.replace(/```json|```|{|}/g, '').trim();
      
      // Fallback response
      return {
        humanizedText: humanizedText || "Failed to humanize the text. Please try again.",
        metrics: {
          correctness: 85,
          clarity: 80,
          engagement: 85,
          delivery: 75
        }
      };
    }
  } catch (error) {
    console.error("Error in humanizing:", error);
    throw error;
  }
}
