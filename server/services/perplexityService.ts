/**
 * Perplexity API Service Implementation
 * Uses Perplexity's API to provide AI functionality for all features
 */

import { 
  GrammarResult, 
  ParaphraseResult, 
  HumanizedResult, 
  AICheckResult, 
  GenerateWritingResult, 
  GenerateWritingParams 
} from './aiServiceTypes';
import { v4 as uuidv4 } from 'uuid';

// Define types for suggestions
interface Suggestion {
  id?: string;
  type: "grammar" | "suggestion" | "ai" | "error";
  text: string;
  replacement: string;
  description: string;
}

// Check if Perplexity API key is available
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const API_ENDPOINT = "https://api.perplexity.ai/chat/completions";

if (!PERPLEXITY_API_KEY) {
  console.warn('PERPLEXITY_API_KEY not set. Using fallback service.');
}

/**
 * Makes a request to Perplexity API
 */
async function callPerplexityAPI(messages: { role: string, content: string }[], temperature: number = 0.7): Promise<string> {
  try {
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY not set");
    }

    // Create request body
    const requestBody = {
      model: "llama-3.1-sonar-small-128k-online",
      messages,
      temperature,
      max_tokens: 1000,
      stream: false
    };
    
    console.log("Calling Perplexity API with model:", requestBody.model);
    console.log("Temperature:", temperature);
    console.log("Messages count:", messages.length);
    
    // Log message structure without revealing full content
    console.log("Message structure:", messages.map(m => ({
      role: m.role,
      contentLength: m.content.length
    })));

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error: ${response.status}`, errorText);
      throw new Error(`Perplexity API error: ${response.status} ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log("Perplexity API response:", {
      id: data.id,
      model: data.model,
      usage: data.usage,
      choices: data.choices?.length || 0,
      contentPreview: data.choices?.[0]?.message?.content?.substring(0, 50) + '...'
    });
    
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error("Error calling Perplexity API:", error);
    throw new Error(`Failed to get response from AI service: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Implements grammar checking using Perplexity API
 */
export async function generateGrammarCheck(text: string): Promise<GrammarResult> {
  try {
    const systemPrompt = `
    You are an expert writing assistant focused on grammar checking.
    Analyze the user's text for grammatical errors, style issues, and clarity problems.
    Provide your response in JSON format with these keys:
    - corrected: The corrected version of the text with all errors fixed
    - highlights: An array of objects representing errors found, each with: 
      { type: "error" or "suggestion", start: character index, end: character index, message: explanation }
    - suggestions: An array of objects with concrete suggestions, each with: 
      { id: UUID, type: "grammar" or "suggestion", text: original text, replacement: suggested replacement, description: explanation }
    Only include actual errors or strong suggestions, be selective.
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ];

    const responseText = await callPerplexityAPI(messages, 0.3);
    const jsonStartIndex = responseText.indexOf('{');
    const jsonEndIndex = responseText.lastIndexOf('}') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error("Invalid response format from API");
    }
    
    const jsonStr = responseText.substring(jsonStartIndex, jsonEndIndex);
    const result = JSON.parse(jsonStr);
    
    // Ensure the result has the correct structure
    const corrected = result.corrected || text;
    const highlights = result.highlights || [];
    const suggestions = result.suggestions || [];
    
    // Assign UUIDs if they don't exist
    (suggestions as Suggestion[]).forEach((suggestion: Suggestion) => {
      if (!suggestion.id) {
        suggestion.id = uuidv4();
      }
    });
    
    return {
      corrected,
      highlights,
      suggestions
    };
  } catch (error) {
    console.error("Error in grammar check:", error);
    // Provide a fallback response
    return {
      corrected: text,
      highlights: [],
      suggestions: [{
        id: uuidv4(),
        type: "grammar",
        text: "",
        replacement: "",
        description: "Unable to analyze text. Please try again later."
      }]
    };
  }
}

/**
 * Implements paraphrasing using Perplexity API
 */
export async function generateParaphrase(text: string, style: string = 'standard'): Promise<ParaphraseResult> {
  try {
    console.log("generateParaphrase called with style:", style);
    let styleDescription = "";
    switch (style.toLowerCase()) {
      case 'formal':
        styleDescription = "Use formal language, academic tone, and sophisticated vocabulary";
        break;
      case 'fluency':
        styleDescription = "Use natural, flowing language with a smooth and conversational tone";
        break;
      case 'academic':
        styleDescription = "Use scholarly language, precise terminology, and structured argumentation";
        break;
      case 'custom':
        styleDescription = "Use creative, expressive language with vivid imagery and varied structures";
        break;
      default: // standard
        styleDescription = "Use clear, balanced language with a neutral tone";
    }

    const systemPrompt = `
    You are an expert writing assistant focused on paraphrasing.
    Rewrite the user's text to express the same meaning in a different way.
    ${styleDescription}.
    Maintain the original meaning while changing the sentence structure and vocabulary.
    
    Return your response in JSON format with the following fields:
    {
      "paraphrased": "your paraphrased text here",
      "metrics": {
        "correctness": number from 0-100,
        "clarity": number from 0-100,
        "engagement": number from 0-100,
        "delivery": number from 0-100
      }
    }
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ];

    const responseText = await callPerplexityAPI(messages, 0.7);
    
    // Extract JSON from response
    const jsonStartIndex = responseText.indexOf('{');
    const jsonEndIndex = responseText.lastIndexOf('}') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      // If no JSON found, just use the text as is
      return { 
        paraphrased: responseText,
        metrics: {
          correctness: 85,
          clarity: 80,
          engagement: 75,
          delivery: 80
        }
      };
    }
    
    try {
      const jsonStr = responseText.substring(jsonStartIndex, jsonEndIndex);
      const result = JSON.parse(jsonStr);
      
      return { 
        paraphrased: result.paraphrased,
        metrics: {
          correctness: result.metrics?.correctness || 85,
          clarity: result.metrics?.clarity || 80,
          engagement: result.metrics?.engagement || 75,
          delivery: result.metrics?.delivery || 80
        }
      };
    } catch (error) {
      // If JSON parsing fails, fall back to using the full text
      return { 
        paraphrased: responseText,
        metrics: {
          correctness: 85,
          clarity: 80,
          engagement: 75,
          delivery: 80
        }
      };
    }
  } catch (error) {
    console.error("Error in paraphrase:", error);
    return { 
      paraphrased: text,
      metrics: {
        correctness: 85,
        clarity: 80,
        engagement: 75,
        delivery: 80
      }
    };
  }
}

/**
 * Implements text humanization using Perplexity API
 */
export async function generateHumanized(text: string, style: string = 'standard'): Promise<HumanizedResult> {
  try {
    console.log("generateHumanized called with style:", style);
    let styleDescription = "";
    switch (style.toLowerCase()) {
      case 'formal':
        styleDescription = "Keep a formal tone while making the text sound written by a human. Use sophisticated vocabulary but with natural variation.";
        break;
      case 'fluency':
        styleDescription = "Make the text flow naturally with varied sentence structure, transitions, and rhythm like a human writer would use.";
        break;
      case 'academic':
        styleDescription = "Maintain scholarly tone but add human touches like occasional hedging, authentic voice, and natural paragraph development.";
        break;
      case 'custom':
        styleDescription = "Add a distinctive personal voice with unique phrasings, occasionally imperfect but natural language patterns.";
        break;
      default: // standard
        styleDescription = "Make the text sound natural and human-written with varied sentence structures and casual language where appropriate.";
    }
    
    const systemPrompt = `
    You are an expert writing assistant focused on making AI-generated text sound more human.
    Rewrite the text to sound more natural, with human-like quirks, varied sentence structure, and less formal patterns.
    ${styleDescription}
    Maintain the original meaning and flow but make it less recognizable as AI-generated.
    
    Return your response in JSON format with the following fields:
    {
      "humanized": "your humanized text here",
      "metrics": {
        "correctness": number from 0-100,
        "clarity": number from 0-100,
        "engagement": number from 0-100,
        "delivery": number from 0-100
      }
    }
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Style: ${style}\n\nText to humanize: ${text}` }
    ];

    const responseText = await callPerplexityAPI(messages, 0.7);
    
    // Extract JSON from response
    const jsonStartIndex = responseText.indexOf('{');
    const jsonEndIndex = responseText.lastIndexOf('}') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      // If no JSON found, just use the text as is
      return { 
        humanized: responseText,
        metrics: {
          correctness: 80,
          clarity: 85,
          engagement: 75,
          delivery: 70
        }
      };
    }
    
    try {
      const jsonStr = responseText.substring(jsonStartIndex, jsonEndIndex);
      const result = JSON.parse(jsonStr);
      
      return { 
        humanized: result.humanized,
        metrics: {
          correctness: result.metrics?.correctness || 80,
          clarity: result.metrics?.clarity || 85,
          engagement: result.metrics?.engagement || 75,
          delivery: result.metrics?.delivery || 70
        }
      };
    } catch (error) {
      // If JSON parsing fails, fall back to using the full text
      return { 
        humanized: responseText,
        metrics: {
          correctness: 80,
          clarity: 85,
          engagement: 75,
          delivery: 70
        }
      };
    }
  } catch (error) {
    console.error("Error in humanize:", error);
    return { 
      humanized: text,
      metrics: {
        correctness: 80,
        clarity: 85,
        engagement: 75,
        delivery: 70
      }
    };
  }
}

/**
 * Implements AI content detection using Perplexity API
 */
export async function checkAIContent(text: string): Promise<AICheckResult> {
  try {
    console.log("checkAIContent called with text of length:", text.length);
    
    const systemPrompt = `
    You are an expert AI detection specialist.
    Analyze the provided text and identify patterns that suggest it was written by AI.
    Look for repetitive structures, specific phrasings common in AI, unnatural flows, and other telltale signs.
    
    Provide your analysis in JSON format with these EXACT keys:
    - aiPercentage: a number between 0-100 indicating how likely the text is AI-generated
    - highlights: an array of objects representing AI-like patterns, each with:
      { id: string, type: "ai", start: number, end: number, message: string }
    - suggestions: an array of objects with suggestions to make it seem more human, each with:
      { id: string, type: "ai", text: string, replacement: string, description: string }
    - metrics: an object with scores for different aspects of the text:
      { correctness: number, clarity: number, engagement: number, delivery: number }
    
    The response MUST be valid JSON that can be parsed with JSON.parse(). 
    Include ONLY the JSON object in your response, with no other text before or after it.
    Be thoughtful and precise in your analysis.
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ];

    const responseText = await callPerplexityAPI(messages, 0.3);
    console.log("AI check raw response:", responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    const jsonStartIndex = responseText.indexOf('{');
    const jsonEndIndex = responseText.lastIndexOf('}') + 1;
    
    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      console.error("Failed to find JSON in response:", responseText);
      throw new Error("Invalid response format from API - no JSON found");
    }
    
    const jsonStr = responseText.substring(jsonStartIndex, jsonEndIndex);
    console.log("Extracted JSON string:", jsonStr.substring(0, 200) + (jsonStr.length > 200 ? '...' : ''));
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
      console.log("Parsed result:", parsedData);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse JSON response");
    }
    
    // Ensure the result has the correct structure
    const aiPercentage = parsedData.aiPercentage || 50;
    const highlights = parsedData.highlights || [];
    const suggestions = parsedData.suggestions || [];
    
    // Assign UUIDs to highlights if they don't exist
    (highlights as any[]).forEach((highlight) => {
      if (!highlight.id) {
        highlight.id = uuidv4();
      }
    });
    
    // Assign UUIDs to suggestions if they don't exist
    (suggestions as Suggestion[]).forEach((suggestion: Suggestion) => {
      if (!suggestion.id) {
        suggestion.id = uuidv4();
      }
    });
    
    // Extract metrics or use defaults
    const metrics = parsedData.metrics || {
      correctness: 80,
      clarity: 75,
      engagement: 70,
      delivery: 65
    };
    
    const finalResult = {
      aiAnalyzed: text,
      aiPercentage,
      highlights,
      suggestions,
      metrics
    };
    
    console.log("Final AI check result:", {
      textLength: finalResult.aiAnalyzed.length,
      aiPercentage: finalResult.aiPercentage,
      highlightsCount: finalResult.highlights.length,
      suggestionsCount: finalResult.suggestions.length,
      metrics: finalResult.metrics
    });
    
    return finalResult;
  } catch (error) {
    console.error("Error in AI check:", error);
    // Provide a fallback response
    return {
      aiAnalyzed: text,
      aiPercentage: 50,
      highlights: [],
      suggestions: [{
        id: uuidv4(),
        type: "ai",
        text: "",
        replacement: "",
        description: "Unable to analyze text. Please try again later."
      }],
      metrics: {
        correctness: 80,
        clarity: 75,
        engagement: 70,
        delivery: 65
      }
    };
  }
}

/**
 * Implements AI writing generation using Perplexity API
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
    let stylePrompt = "";
    switch (style.toLowerCase()) {
      case 'academic':
        stylePrompt = "Use formal academic language with proper citations, structured arguments, and scholarly tone.";
        break;
      case 'creative':
        stylePrompt = "Use creative, engaging language with vivid imagery, varied sentence structure, and an expressive voice.";
        break;
      case 'business':
        stylePrompt = "Use clear, professional language with concise points, data-driven insights, and actionable recommendations.";
        break;
      case 'conversational':
        stylePrompt = "Use a casual, friendly tone with contractions, simpler vocabulary, and a more personal approach.";
        break;
      default:
        stylePrompt = "Use a balanced, clear writing style with a professional tone and accessible language.";
    }

    let contentPrompt = `Write about the following topic: ${topic}. `;
    contentPrompt += `Create content that is approximately ${length}. `;
    contentPrompt += stylePrompt + " ";
    
    if (originalSample) {
      contentPrompt += `Emulate aspects of this writing style: "${originalSample.substring(0, 300)}${originalSample.length > 300 ? '...' : ''}" `;
    }
    
    if (referenceUrl) {
      contentPrompt += `Consider information from this reference: ${referenceUrl} `;
    }
    
    if (additionalInstructions) {
      contentPrompt += `Additional instructions: ${additionalInstructions}`;
    }

    const systemPrompt = `
    You are an expert writing assistant capable of generating high-quality, well-structured content on any topic.
    Produce thoughtful, original content that is engaging and informative.
    Include a clear introduction, well-developed main points, and a strong conclusion.
    Format with appropriate headers and structure for readability.
    Respond with ONLY the generated content.
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: contentPrompt }
    ];

    const generatedText = await callPerplexityAPI(messages, 0.7);
    
    return { generatedText };
  } catch (error) {
    console.error("Error in writing generation:", error);
    return { 
      generatedText: `Unable to generate content on "${topic}" at this time. Please try again later or adjust your request parameters.` 
    };
  }
}

/**
 * Implements chat functionality using Perplexity API
 */
export async function generateChatResponse(messages: { role: string, content: string }[]): Promise<string> {
  try {
    const systemMessage = {
      role: "system",
      content: `You are a helpful AI writing assistant specializing in grammar, style, paraphrasing, 
      and creating original content. You provide thoughtful, detailed responses about writing topics. 
      When asked to analyze text, provide specific feedback and constructive suggestions for improvement. 
      Stay focused on writing assistance and don't discuss topics unrelated to writing, language, 
      or communication. Maintain a friendly, supportive tone.`
    };

    // Prepend the system message to the chat history
    const fullMessages = [systemMessage, ...messages];
    
    // Ensure the last message is from the user
    if (fullMessages[fullMessages.length - 1].role !== 'user') {
      throw new Error("The last message must be from the user");
    }

    return await callPerplexityAPI(fullMessages, 0.7);
  } catch (error) {
    console.error("Error in chat response:", error);
    return "I apologize, but I'm having trouble generating a response right now. Please try again in a moment.";
  }
}