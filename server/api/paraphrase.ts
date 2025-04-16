import { generateGeminiResponse } from '../utils/gemini-api';

interface ParaphraseResult {
  paraphrasedText: string;
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export async function paraphraseText(text: string, style: string = 'standard'): Promise<ParaphraseResult> {
  try {
    // Map style to specific instructions
    const styleInstructions = {
      standard: "Maintain a balanced, neutral tone. Keep the meaning intact while changing the wording.",
      fluency: "Focus on making the text flow naturally and sound conversational.",
      formal: "Use formal language, proper terminology, and maintain a professional tone.",
      academic: "Use academic vocabulary, complex sentence structures, and formal citations if present.",
      custom: "Keep the core meaning but change the vocabulary and sentence structure significantly."
    };
    
    const selectedStyle = styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.standard;
    
    const prompt = `
      Paraphrase the following text. ${selectedStyle}
      
      Text to paraphrase: "${text}"
      
      Format your response as JSON with the following structure:
      {
        "paraphrasedText": "the paraphrased version of the text",
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
        parsedResponse.paraphrasedText && 
        parsedResponse.metrics) {
      return parsedResponse as ParaphraseResult;
    } else {
      // Extract text if JSON parsing failed
      const paraphrasedText = response.replace(/```json|```|{|}/g, '').trim();
      
      // Fallback response
      return {
        paraphrasedText: paraphrasedText || "Failed to paraphrase the text. Please try again.",
        metrics: {
          correctness: 85,
          clarity: 80,
          engagement: 75,
          delivery: 70
        }
      };
    }
  } catch (error) {
    console.error("Error in paraphrasing:", error);
    throw error;
  }
}
