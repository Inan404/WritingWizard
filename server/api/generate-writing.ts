import { generateWriting as generateAIWriting } from '../services/aiService';

interface GenerateWritingParams {
  originalSample: string;
  referenceUrl?: string;
  topic: string;
  length?: string;
  style?: string;
  additionalInstructions?: string;
}

interface GenerateWritingResult {
  generatedText: string;
}

export async function generateWriting(params: GenerateWritingParams): Promise<GenerateWritingResult> {
  try {
    const { 
      originalSample, 
      referenceUrl, 
      topic, 
      length = 'medium', 
      style = 'conversational',
      additionalInstructions 
    } = params;
    
    // Map length to word count
    const lengthMap = {
      short: "approximately 250 words",
      medium: "approximately 500 words",
      long: "approximately 1000-1500 words"
    };
    
    const wordCount = lengthMap[length as keyof typeof lengthMap] || lengthMap.medium;
    
    // Map style to specific instructions
    const styleInstructions = {
      formal: "Use formal language, proper terminology, and maintain a professional tone.",
      conversational: "Use a friendly, conversational tone with contractions and simpler sentence structures.",
      academic: "Use academic vocabulary, complex sentence structures, and formal citations if appropriate.",
      creative: "Use vivid descriptions, metaphors, and creative language.",
      technical: "Use precise terminology, define concepts clearly, and maintain a clear logical structure."
    };
    
    const styleGuide = styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.conversational;
    
    let referenceText = "";
    if (referenceUrl) {
      referenceText = `Reference this source for factual information: ${referenceUrl}`;
    }
    
    // Use Perplexity API for writing generation through aiService
    const result = await generateAIWriting({
      originalSample,
      topic,
      style,
      length,
      referenceUrl,
      additionalInstructions
    });
    
    return result;
  } catch (error) {
    console.error("Error generating writing:", error);
    throw error;
  }
}
