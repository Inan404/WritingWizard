/**
 * Mock AI Service - A free alternative that returns canned responses for development
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  GrammarResult, 
  ParaphraseResult, 
  HumanizedResult, 
  AICheckResult, 
  GenerateWritingResult,
  GenerateWritingParams
} from './aiServiceTypes';

/**
 * Generates a mock grammar check response
 */
export async function generateGrammarCheck(text: string): Promise<GrammarResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate a simple mock response
  const words = text.split(' ');
  const highlights = [];
  const suggestions = [];
  
  // Create random suggestions for demonstration
  let position = 0;
  for (const word of words) {
    if (Math.random() < 0.1) { // 10% chance of finding an "error"
      const start = text.indexOf(word, position);
      const end = start + word.length;
      
      // Skip if we couldn't find the word (shouldn't happen but just in case)
      if (start === -1) continue;
      
      // Update position for next search
      position = end;
      
      // Type of issue - randomly assign
      const type = Math.random() < 0.5 ? 'error' : 'suggestion';
      
      // Create a highlight
      highlights.push({
        type,
        start,
        end,
        suggestion: word.length > 3 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
        message: `Consider revising this ${type === 'error' ? 'error' : 'for better clarity'}`
      });
      
      // Create a corresponding suggestion
      suggestions.push({
        id: uuidv4(),
        type: type === 'error' ? 'grammar' : 'suggestion',
        text: word,
        replacement: word.length > 3 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
        description: type === 'error' 
          ? 'This may be a grammatical error. Consider the suggested correction.' 
          : 'This could be phrased more clearly. Consider the suggestion.'
      });
    }
  }
  
  return {
    corrected: text,
    highlights,
    suggestions
  };
}

/**
 * Generates a mock paraphrase response
 */
export async function generateParaphrase(text: string, style: string = 'standard'): Promise<ParaphraseResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For demo purposes, just change some words based on style
  let paraphrased = text;
  
  const styleMap: { [key: string]: string[] } = {
    'standard': ['also', 'likewise', 'additionally', 'furthermore', 'moreover'],
    'fluency': ['smoothly', 'expertly', 'effortlessly', 'gracefully', 'seamlessly'],
    'formal': ['therefore', 'subsequently', 'consequently', 'hence', 'thus'],
    'academic': ['aforementioned', 'significant', 'empirical', 'theoretical', 'fundamental'],
    'custom': ['uniquely', 'specifically', 'particularly', 'especially', 'notably']
  };
  
  // Simple word substitution for demonstration
  if (styleMap[style]) {
    const styleWords = styleMap[style];
    
    // Simple substitution of common words with style-specific alternatives
    paraphrased = text
      .replace(/also/gi, styleWords[0])
      .replace(/and/gi, styleWords[1])
      .replace(/in addition/gi, styleWords[2])
      .replace(/more/gi, styleWords[3])
      .replace(/as well/gi, styleWords[4]);
  }
  
  // Reformat some sentences for demonstration
  const sentences = paraphrased.split('. ');
  paraphrased = sentences.map((sentence, i) => {
    // Reorder some sentences for effect
    if (i % 2 === 1 && sentence.includes(' ')) {
      const words = sentence.split(' ');
      if (words.length > 3) {
        const firstPart = words.slice(0, Math.floor(words.length / 2));
        const secondPart = words.slice(Math.floor(words.length / 2));
        return [...secondPart, '—', ...firstPart].join(' ');
      }
    }
    return sentence;
  }).join('. ');
  
  return { paraphrased };
}

/**
 * Generates a mock humanized text response
 */
export async function generateHumanized(text: string, style: string = 'standard'): Promise<HumanizedResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For demo, add human-like quirks to make AI text sound more natural
  let humanized = text;
  
  // Add some "humanizing" elements
  humanized = humanized
    // Add some filler words
    .replace(/\. /g, '. Well, ')
    // Add some contractions
    .replace(/it is/g, "it's")
    .replace(/cannot/g, "can't")
    .replace(/do not/g, "don't")
    // Add some conversational elements
    .replace(/furthermore/g, "also")
    .replace(/therefore/g, "so")
    .replace(/subsequently/g, "after that")
    // Break up some perfect sentences
    .replace(/\. /g, (match, index) => {
      return Math.random() < 0.3 ? '! ' : '. ';
    });
  
  return { humanized };
}

/**
 * Generates a mock AI content check response
 */
export async function checkAIContent(text: string): Promise<AICheckResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Parse the text and find patterns that look "AI-generated"
  const aiPercentage = Math.floor(Math.random() * 75) + 25; // Random value between 25-99
  
  // Pattern matching for phrases that sound like AI
  const aiPatterns = [
    'as an AI language model',
    'in conclusion',
    'furthermore',
    'on the other hand',
    'it is worth noting',
    'subsequently',
    'in summary',
  ];
  
  // Create mock AI detection highlights
  const highlights = [];
  const suggestions = [];
  
  // Find any patterns in the text
  for (const pattern of aiPatterns) {
    const patternRegExp = new RegExp(pattern, 'gi');
    let match;
    
    while ((match = patternRegExp.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      highlights.push({
        type: 'ai',
        start,
        end,
        message: `This phrase pattern "${pattern}" is commonly used by AI models`
      });
      
      // Create a more human alternative
      let replacement = '';
      switch (pattern) {
        case 'as an AI language model':
          replacement = 'in my view';
          break;
        case 'in conclusion':
          replacement = 'to wrap up';
          break;
        case 'furthermore':
          replacement = 'also';
          break;
        case 'on the other hand':
          replacement = 'but then again';
          break;
        case 'it is worth noting':
          replacement = 'interestingly';
          break;
        case 'subsequently':
          replacement = 'after that';
          break;
        case 'in summary':
          replacement = 'to sum it up';
          break;
        default:
          replacement = pattern;
      }
      
      suggestions.push({
        id: uuidv4(),
        type: 'ai',
        text: match[0],
        replacement,
        description: 'This phrase is commonly used in AI-generated content. Consider using a more conversational alternative.'
      });
    }
  }
  
  // Also suggest changes for sentences that are too long or complex
  const sentences = text.split(/[.!?]+/);
  let position = 0;
  
  for (const sentence of sentences) {
    const start = text.indexOf(sentence, position);
    if (start === -1) continue;
    
    const end = start + sentence.length;
    position = end;
    
    // If sentence is very long, flag it
    if (sentence.length > 150) {
      highlights.push({
        type: 'ai',
        start,
        end,
        message: 'Long, complex sentences are a common pattern in AI writing'
      });
      
      suggestions.push({
        id: uuidv4(),
        type: 'ai',
        text: sentence,
        replacement: 'Break this into 2-3 shorter sentences for a more human touch.',
        description: 'Human writers tend to use shorter sentences with varied structure. Consider breaking this up.'
      });
    }
  }
  
  return {
    aiAnalyzed: text,
    aiPercentage,
    highlights,
    suggestions
  };
}

/**
 * Generates mock writing content
 */
export async function generateWriting({
  originalSample = '',
  referenceUrl = '',
  topic,
  length = '500 words',
  style = 'Academic',
  additionalInstructions = ''
}: GenerateWritingParams): Promise<GenerateWritingResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate a demo response based on the topic
  const generatedText = `
# ${topic}

This is a generated mock response on the topic of "${topic}" in the "${style}" style.

${originalSample ? 'I have incorporated elements of your writing style sample.' : 'This is written in a general style.'}

${referenceUrl ? `I have considered the reference materials at ${referenceUrl}.` : 'No reference materials were provided.'}

The requested length was ${length}, and the format is ${additionalInstructions || 'essay'}.

## Introduction

The topic of ${topic} is fascinating and multifaceted. There are many angles from which we could approach this subject, each offering unique insights and perspectives.

## Main Points

First, it's important to consider the historical context surrounding ${topic}. The evolution of thought in this area has been marked by significant developments and paradigm shifts over time.

Second, the contemporary relevance of ${topic} cannot be overstated. In our rapidly changing world, understanding the implications of this subject is crucial for navigating complex challenges.

Finally, the future directions of research on ${topic} promise to yield exciting new discoveries and applications that could transform our understanding.

## Conclusion

In summary, ${topic} represents a rich area of inquiry with important implications for theory and practice. By continuing to explore this subject with rigor and creativity, we can develop more nuanced and comprehensive approaches.

`;

  return { generatedText };
}