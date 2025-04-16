import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI SDK
const API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

interface GrammarResult {
  corrected: string;
  highlights: Array<{
    type: "suggestion" | "error" | "ai";
    start: number;
    end: number;
    suggestion?: string;
    message?: string;
  }>;
  suggestions: Array<{
    id: string;
    type: "grammar" | "suggestion" | "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>;
}

interface ParaphraseResult {
  paraphrased: string;
}

interface HumanizedResult {
  humanized: string;
}

interface AICheckResult {
  aiAnalyzed: string;
  aiPercentage: number;
  highlights: Array<{
    type: "ai";
    start: number;
    end: number;
    message?: string;
  }>;
  suggestions: Array<{
    id: string;
    type: "ai" | "error";
    text: string;
    replacement: string;
    description: string;
  }>;
}

interface GenerateWritingResult {
  generatedText: string;
}

// Grammar check function
export async function generateGrammarCheck(text: string): Promise<GrammarResult> {
  try {
    const prompt = `
      I want you to act as a grammar checker like Grammarly. Analyze the following text for grammar, spelling, punctuation, 
      and style issues. Your response should be in JSON format with the following structure:
      {
        "corrected": "the corrected text",
        "highlights": [
          {
            "type": "error" or "suggestion",
            "start": position in original text where the issue starts,
            "end": position in original text where the issue ends,
            "suggestion": "suggested correction",
            "message": "explanation of the issue"
          }
          // more highlights as needed
        ],
        "suggestions": [
          {
            "id": "unique identifier",
            "type": "grammar" or "suggestion" or "error",
            "text": "the problematic text",
            "replacement": "suggested replacement",
            "description": "explanation of why this should be changed"
          }
          // more suggestions as needed
        ]
      }

      The text to check is: "${text}"
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textValue = response.text();
    
    // Extract JSON from the response
    const jsonMatch = textValue.match(/```json\s*([\s\S]*?)\s*```/) || 
                       textValue.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[0].replace(/```json|```/g, '').trim();
      return JSON.parse(jsonString);
    }
    
    // Fallback basic response if JSON parsing fails
    return {
      corrected: text,
      highlights: [],
      suggestions: [
        {
          id: "1",
          type: "grammar",
          text: "sample",
          replacement: "sample",
          description: "This is a placeholder response. Could not parse the AI output."
        }
      ]
    };
  } catch (error) {
    console.error("Grammar check generation error:", error);
    throw new Error("Failed to check grammar");
  }
}

// Paraphraser function
export async function generateParaphrase(text: string, style: string = 'standard'): Promise<ParaphraseResult> {
  try {
    const prompt = `
      I want you to act as a paraphrasing tool. Rewrite the following text in a different way while maintaining its original meaning.
      Use the "${style}" writing style. Just return the paraphrased text without any additional explanations.

      Original text:
      "${text}"
    `;

    const result = await model.generateContent(prompt);
    const paraphrased = result.response.text();
    
    return { paraphrased };
  } catch (error) {
    console.error("Paraphrase generation error:", error);
    throw new Error("Failed to paraphrase text");
  }
}

// Humanizer function
export async function generateHumanized(text: string, style: string = 'standard'): Promise<HumanizedResult> {
  try {
    const prompt = `
      I want you to act as a text humanizer that makes AI-generated content sound more natural and human-written.
      Use the "${style}" writing style. Modify the following text to make it more conversational, include natural human
      quirks, vary sentence structures, and avoid overly perfect grammar or AI patterns. 
      Just return the humanized text without any additional explanations.

      Original AI text:
      "${text}"
    `;

    const result = await model.generateContent(prompt);
    const humanized = result.response.text();
    
    return { humanized };
  } catch (error) {
    console.error("Humanizer generation error:", error);
    throw new Error("Failed to humanize text");
  }
}

// AI content checker function
export async function checkAIContent(text: string): Promise<AICheckResult> {
  try {
    const prompt = `
      I want you to act as an AI content detector. Analyze the following text and determine what percentage 
      of it appears to be AI-generated. Also identify specific phrases or patterns that look like they were 
      written by AI. Your response should be in JSON format with the following structure:
      {
        "aiAnalyzed": "the analyzed text with potential modifications",
        "aiPercentage": numerical percentage of text that seems AI-generated (0-100),
        "highlights": [
          {
            "type": "ai",
            "start": position in original text where AI content starts,
            "end": position in original text where AI content ends,
            "message": "explanation of why this looks AI-generated"
          }
          // more highlights as needed
        ],
        "suggestions": [
          {
            "id": "unique identifier",
            "type": "ai",
            "text": "the problematic AI-like text",
            "replacement": "more human-like alternative",
            "description": "explanation of why this should be changed"
          }
          // more suggestions as needed
        ]
      }

      The text to analyze is: "${text}"
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const textValue = response.text();
    
    // Extract JSON from the response
    const jsonMatch = textValue.match(/```json\s*([\s\S]*?)\s*```/) || 
                       textValue.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[0].replace(/```json|```/g, '').trim();
      return JSON.parse(jsonString);
    }
    
    // Fallback basic response if JSON parsing fails
    return {
      aiAnalyzed: text,
      aiPercentage: 50,
      highlights: [],
      suggestions: [
        {
          id: "1",
          type: "ai",
          text: "sample",
          replacement: "sample alternative",
          description: "This is a placeholder response. Could not parse the AI output."
        }
      ]
    };
  } catch (error) {
    console.error("AI check generation error:", error);
    throw new Error("Failed to check AI content");
  }
}

// Writing generator function
export async function generateWriting(
  sample: string = '',
  references: string = '',
  instructions: string,
  length: string = '500 words',
  style: string = 'Academic',
  format: string = 'Essay'
): Promise<GenerateWritingResult> {
  try {
    let prompt = `
      I want you to generate ${format} content based on the following instructions:
      "${instructions}"

      Length: ${length}
      Style: ${style}
      Format: ${format}
    `;

    if (sample) {
      prompt += `\n\nHere is a sample of my writing style to emulate:
      "${sample}"`;
    }

    if (references) {
      prompt += `\n\nHere are reference materials to incorporate:
      "${references}"`;
    }

    prompt += `\n\nPlease generate original content that follows these specifications. Do not include any introduction
    like "Here's a 500-word essay..." - just provide the content directly.`;

    const result = await model.generateContent(prompt);
    const generatedText = result.response.text();
    
    return { generatedText };
  } catch (error) {
    console.error("Content generation error:", error);
    throw new Error("Failed to generate writing");
  }
}
