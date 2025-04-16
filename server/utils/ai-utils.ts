import { db } from '../db';
import { insertWritingChatSchema, writingChats } from '../../shared/schema';
import { z } from 'zod';

const writingChatInputSchema = z.object({
  userId: z.number().optional(),
  rawText: z.string(),
  prompt: z.object({
    topic: z.string(),
    style: z.string().optional(),
    length: z.string().optional(),
    additionalInstructions: z.string().optional(),
  }),
  result: z.string(),
  metadata: z.record(z.any()).optional(),
});

type WritingChatInput = z.infer<typeof writingChatInputSchema>;

export async function storeWritingChat(input: WritingChatInput) {
  try {
    // Validate input
    const validatedInput = writingChatInputSchema.parse(input);
    
    // Create record in database
    const [insertedChat] = await db
      .insert(writingChats)
      .values({
        userId: validatedInput.userId,
        rawText: validatedInput.rawText,
        prompt: validatedInput.prompt,
        result: validatedInput.result,
        metadata: validatedInput.metadata || {},
      })
      .returning();
    
    return insertedChat;
  } catch (error) {
    console.error("Error storing writing chat:", error);
    throw error;
  }
}

export function extractWritingStyle(text: string): Record<string, number> {
  // Simple analysis of writing style characteristics
  // In a real-world application, this would use more sophisticated NLP
  
  const style = {
    averageSentenceLength: 0,
    vocabularyComplexity: 0,
    formalityScore: 0,
    adjectiveUsage: 0,
    adverbUsage: 0,
    transitionUsage: 0,
  };
  
  // Calculate average sentence length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  if (sentences.length > 0) {
    style.averageSentenceLength = words.length / sentences.length;
  }
  
  // Simple vocabulary complexity (count longer words)
  const longWords = words.filter(w => w.length > 6).length;
  style.vocabularyComplexity = words.length > 0 ? (longWords / words.length) * 100 : 0;
  
  // Count formal phrases
  const formalPhrases = [
    "therefore", "consequently", "furthermore", "moreover", "thus", "hence", 
    "in addition", "in conclusion", "subsequently"
  ];
  
  let formalCount = 0;
  for (const phrase of formalPhrases) {
    const regex = new RegExp(`\\b${phrase}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) {
      formalCount += matches.length;
    }
  }
  
  style.formalityScore = words.length > 0 ? (formalCount / words.length) * 100 : 0;
  
  // Count adjectives and adverbs (simplified approach)
  const adjectives = words.filter(w => w.match(/able$|ful$|ous$|ive$|ic$|al$|ent$|ish$/)).length;
  const adverbs = words.filter(w => w.match(/ly$/)).length;
  
  style.adjectiveUsage = words.length > 0 ? (adjectives / words.length) * 100 : 0;
  style.adverbUsage = words.length > 0 ? (adverbs / words.length) * 100 : 0;
  
  // Count transition words
  const transitions = [
    "however", "although", "despite", "nevertheless", "otherwise", "instead",
    "still", "yet", "meanwhile", "likewise", "similarly", "indeed"
  ];
  
  let transitionCount = 0;
  for (const word of transitions) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) {
      transitionCount += matches.length;
    }
  }
  
  style.transitionUsage = words.length > 0 ? (transitionCount / words.length) * 100 : 0;
  
  return style;
}
