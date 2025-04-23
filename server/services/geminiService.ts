/**
 * Gemini API Service Implementation
 * Uses Google's Gemini API to provide AI functionality for all features
 */

import { v4 as uuidv4 } from 'uuid';
import { generateGeminiResponse } from '../utils/gemini-api';
import { 
  GrammarResult, 
  ParaphraseResult, 
  HumanizedResult, 
  AICheckResult, 
  GenerateWritingResult, 
  GenerateWritingParams 
} from './aiServiceTypes';

// Helper function to analyze a text with grammar checking prompt
async function analyzeText(text: string): Promise<any> {
  try {
    const prompt = `
    Please analyze the following text for grammar, spelling, and style improvements. Return a JSON object with:
    1. A "corrected" field with a corrected version of the text.
    2. A "highlights" array with objects containing:
       - "type": either "error" (for grammar/spelling errors) or "suggestion" (for style improvements)
       - "start": character index where the issue starts
       - "end": character index where the issue ends
       - "suggestion": what to replace this text with
       - "message": explanation of the issue
    3. A "suggestions" array with objects containing:
       - "id": a unique identifier
       - "type": either "grammar", "suggestion", or "error"
       - "text": the original problematic text
       - "replacement": suggested replacement
       - "description": explanation of why this change is suggested

    Here's the text to analyze:
    "${text}"

    Return ONLY a valid JSON object that can be parsed using JSON.parse(). 
    Do not include any explanation or other text outside the JSON object.
    `;

    const jsonResponse = await generateGeminiResponse(prompt, 2048);
    
    try {
      // Extract just the JSON part (in case there's any explanation text)
      const jsonMatch = jsonResponse.match(/\\{([\\s\\S]*?)\\}/);
      const jsonString = jsonMatch ? '{' + jsonMatch[1] + '}' : jsonResponse;
      
      // Parse the JSON response
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse grammar check response:', parseError);
      // If parsing fails, try a more forgiving approach to extract JSON
      const jsonContent = jsonResponse.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      return JSON.parse(jsonContent);
    }
  } catch (error) {
    console.error('Error in grammar analysis:', error);
    // Return a basic result in case of error
    return {
      corrected: text,
      highlights: [],
      suggestions: []
    };
  }
}

/**
 * Implements grammar checking using Gemini API
 */
export async function generateGrammarCheck(text: string): Promise<GrammarResult> {
  try {
    const analysisResult = await analyzeText(text);
    
    // Ensure the response has all required properties
    return {
      corrected: analysisResult.corrected || text,
      highlights: Array.isArray(analysisResult.highlights) 
        ? analysisResult.highlights 
        : [],
      suggestions: Array.isArray(analysisResult.suggestions) 
        ? analysisResult.suggestions.map((suggestion: any) => ({
            ...suggestion,
            id: suggestion.id || uuidv4()
          }))
        : []
    };
  } catch (error) {
    console.error('Error in grammar check service:', error);
    return {
      corrected: text,
      highlights: [],
      suggestions: []
    };
  }
}

/**
 * Implements paraphrasing using Gemini API
 */
export async function generateParaphrase(text: string, style: string = 'standard'): Promise<ParaphraseResult> {
  try {
    const prompt = `
    Please paraphrase the following text in a "${style}" style. Maintain the original meaning while changing the wording and structure.
    
    Original text:
    "${text}"
    
    Instructions:
    1. For "standard" style: make it clearer and more straightforward
    2. For "fluency" style: make it smooth and easy to read
    3. For "formal" style: use more formal and professional language
    4. For "academic" style: use academic terminology and structure
    5. For "custom" style: make it unique and creative
    
    Return ONLY the paraphrased text, no explanations or other text.
    `;

    const paraphrased = await generateGeminiResponse(prompt, 2048);
    return { paraphrased };
  } catch (error) {
    console.error('Error in paraphrase service:', error);
    return { paraphrased: text };
  }
}

/**
 * Implements text humanization using Gemini API
 */
export async function generateHumanized(text: string, style: string = 'standard'): Promise<HumanizedResult> {
  try {
    const prompt = `
    Please rewrite the following text to sound more human and less like AI-generated content.
    Make it more conversational, natural, and authentic. Add variety in sentence structure,
    use contractions, and add a touch of human personality.
    
    Original text:
    "${text}"
    
    Instructions:
    1. Add natural variations in sentence length and structure
    2. Use contractions where appropriate (e.g., "don't" instead of "do not")
    3. Add some conversational elements
    4. Replace overly formal language with more natural expressions
    5. Vary your transitions instead of using "furthermore," "moreover," etc.
    6. The style should be: "${style}"
    
    Return ONLY the humanized text, no explanations or other text.
    `;

    const humanized = await generateGeminiResponse(prompt, 2048);
    return { humanized };
  } catch (error) {
    console.error('Error in humanize service:', error);
    return { humanized: text };
  }
}

/**
 * Implements AI content detection using Gemini API
 */
export async function checkAIContent(text: string): Promise<AICheckResult> {
  try {
    const prompt = `
    Please analyze the following text to determine how likely it was generated by AI.
    Return a JSON object with:
    
    1. An "aiPercentage" field with a number from 0-100 representing how likely the text is AI-generated
    2. A "aiAnalyzed" field with the original text
    3. A "highlights" array with objects containing:
       - "type": "ai"
       - "start": character index where AI-like pattern starts
       - "end": character index where AI-like pattern ends
       - "message": explanation of why this pattern seems AI-generated
    4. A "suggestions" array with objects containing:
       - "id": a unique identifier string
       - "type": "ai"
       - "text": the original AI-like text
       - "replacement": suggested more human-like replacement
       - "description": explanation of why this change would make the text sound more human
    
    Focus on patterns typical of AI writing: repetitive structure, overuse of transition words,
    overly formal language, lack of personality, etc.
    
    Here's the text to analyze:
    "${text}"
    
    Return ONLY a valid JSON object that can be parsed using JSON.parse().
    Do not include any explanation or other text outside the JSON object.
    `;

    const jsonResponse = await generateGeminiResponse(prompt, 2048);
    
    try {
      // Extract just the JSON part
      const jsonMatch = jsonResponse.match(/\\{([\\s\\S]*?)\\}/);
      const jsonString = jsonMatch ? '{' + jsonMatch[1] + '}' : jsonResponse;
      
      const result = JSON.parse(jsonString);
      
      // Ensure the response has all required properties
      return {
        aiAnalyzed: text,
        aiPercentage: typeof result.aiPercentage === 'number' ? result.aiPercentage : 0,
        highlights: Array.isArray(result.highlights) ? result.highlights : [],
        suggestions: Array.isArray(result.suggestions) 
          ? result.suggestions.map((suggestion: any) => ({
              ...suggestion,
              id: suggestion.id || uuidv4()
            }))
          : []
      };
    } catch (parseError) {
      console.error('Failed to parse AI check response:', parseError);
      // If parsing fails, create a basic result
      return {
        aiAnalyzed: text,
        aiPercentage: 0,
        highlights: [],
        suggestions: []
      };
    }
  } catch (error) {
    console.error('Error in AI content check service:', error);
    return {
      aiAnalyzed: text,
      aiPercentage: 0,
      highlights: [],
      suggestions: []
    };
  }
}

/**
 * Implements AI writing generation using Gemini API
 */
export async function generateWriting({
  originalSample = '',
  referenceUrl = '',
  topic,
  length = '500 words',
  style = 'Academic',
  additionalInstructions = ''
}: GenerateWritingParams): Promise<GenerateWritingResult> {
  try {
    const prompt = `
    Please write a high-quality piece on the topic of "${topic}".
    
    ${originalSample ? `Here's a sample of writing to match the style:\n"${originalSample}"\n` : ''}
    ${referenceUrl ? `Please consider this reference as a source: ${referenceUrl}\n` : ''}
    
    Length: ${length}
    Style: ${style}
    ${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ''}
    
    Return ONLY the generated text, no explanations or other text.
    `;

    const generatedText = await generateGeminiResponse(prompt, 4096);
    return { generatedText };
  } catch (error) {
    console.error('Error in writing generation service:', error);
    return { 
      generatedText: `Failed to generate content for the topic: ${topic}. Please try again later.` 
    };
  }
}

/**
 * Implements chat functionality using Gemini API
 */
export async function generateChatResponse(messages: { role: string, content: string }[]): Promise<string> {
  try {
    // Format the chat history for the prompt
    const chatHistory = messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    const prompt = `
    You are a helpful AI writing assistant. Your role is to help users with their writing needs,
    including drafting content, improving grammar and style, and answering questions about writing.
    
    Here is the conversation history so far:
    ${chatHistory}
    
    Please provide your next response as the AI writing assistant. Be helpful, friendly, and focus on writing assistance.
    Respond directly without prefacing with "Assistant:" or similar indicators.
    `;

    return await generateGeminiResponse(prompt, 2048);
  } catch (error) {
    console.error('Error in chat response generation:', error);
    return "I'm sorry, I'm having trouble generating a response right now. Please try again later.";
  }
}