import { generateParaphrase } from '../services/perplexityService';

interface ParaphraseResult {
  paraphrasedText: string;
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

export async function paraphraseText(text: string, style: string = 'standard', customTone?: string): Promise<ParaphraseResult> {
  try {
    // If it's a custom style with a provided tone, pass that to the service
    const result = style === 'custom' && customTone 
      ? await generateParaphrase(text, style, customTone)
      : await generateParaphrase(text, style);
    
    // Return the result in the expected format
    return {
      paraphrasedText: result.paraphrased,
      metrics: result.metrics || {
        correctness: 85,
        clarity: 80,
        engagement: 75,
        delivery: 70
      }
    };
  } catch (error) {
    console.error("Error in paraphrasing:", error);
    
    // Return a fallback response if the service fails
    return {
      paraphrasedText: "Failed to paraphrase the text. Please try again.",
      metrics: {
        correctness: 85,
        clarity: 80,
        engagement: 75,
        delivery: 70
      }
    };
  }
}
