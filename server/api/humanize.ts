import { generateHumanized } from '../services/aiService';

interface HumanizeResult {
  humanizedText: string;
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export async function humanizeText(text: string, style: string = 'standard', customTone?: string): Promise<HumanizeResult> {
  try {
    // Use Gemini AI for humanizing through aiService with enhanced anti-detection techniques
    const result = await generateHumanized(text, style, customTone);
    
    // If we get a valid result from Gemini
    if (result && 
        result.humanizedText && 
        result.metrics) {
      return {
        humanizedText: result.humanizedText,
        metrics: result.metrics
      };
    } else {
      // Fallback response
      return {
        humanizedText: "Failed to humanize the text. Please try again.",
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
