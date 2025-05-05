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
    
    // Use Perplexity API for humanizing through aiService
    const result = await generateHumanized(text, style);
    
    // If we get a valid result from Perplexity
    if (result && 
        result.humanizedText && 
        result.metrics) {
      return result as HumanizeResult;
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
