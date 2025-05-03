/**
 * Perplexity API Service
 * Uses the Perplexity API with the llama-3.1-sonar-small-128k-online model
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Check if Perplexity API key is available
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  console.warn("Warning: PERPLEXITY_API_KEY is not set. AI features will be limited.");
}

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequestOptions {
  model?: string;
  messages: PerplexityMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

interface PerplexityResponseChoice {
  index: number;
  finish_reason: string;
  message: {
    role: string;
    content: string;
  };
}

interface PerplexityResponse {
  id: string;
  model: string;
  created: number;
  choices: PerplexityResponseChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Default model - Llama 3.1 Sonar Small with 128k context
const DEFAULT_MODEL = 'llama-3.1-sonar-small-128k-online';

/**
 * Call the Perplexity API with the provided messages
 */
async function callPerplexityAPI(options: PerplexityRequestOptions): Promise<PerplexityResponse> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is not set. Cannot use AI features.");
  }

  // Default parameters for the API
  const requestOptions = {
    model: options.model || DEFAULT_MODEL,
    messages: options.messages,
    max_tokens: options.max_tokens || 1024,
    temperature: options.temperature || 0.7,
    top_p: options.top_p || 0.9,
    frequency_penalty: options.frequency_penalty || 0,
    presence_penalty: options.presence_penalty || 0,
    stream: options.stream || false
  };

  try {
    console.log(`Calling Perplexity API with model: ${requestOptions.model}`);
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(requestOptions)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as PerplexityResponse;
    return data;
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    throw error;
  }
}

/**
 * Generate a response for grammar checking
 */
export async function generateGrammarCheck(text: string) {
  const systemPrompt = `You are an expert writing assistant specializing in grammar correction.
Analyze the provided text and correct any grammatical, punctuation, spelling, or syntax errors.
Provide your response in the following JSON format:
{
  "corrected": "The corrected text with all errors fixed",
  "highlights": [
    {
      "original": "text with error",
      "correction": "corrected text",
      "explanation": "Brief explanation of the error"
    }
  ],
  "metrics": {
    "correctness": 85,
    "clarity": 70,
    "engagement": 80,
    "delivery": 75
  }
}
The metrics should be scores from 0-100 assessing aspects of the writing.`;

  try {
    const response = await callPerplexityAPI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.2, // Lower temperature for more deterministic results
    });

    // Parse the response content as JSON
    const content = response.choices[0].message.content;
    const parsedResponse = JSON.parse(content);
    return parsedResponse;
  } catch (error: any) {
    console.error('Error in grammar check:', error);
    throw new Error(`Failed to check grammar: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a paraphrased version of the text
 */
export async function generateParaphrase(text: string, style: string = 'standard') {
  const styleDescriptions: Record<string, string> = {
    'standard': 'Maintain the original tone while rewording for clarity.',
    'formal': 'Use more formal language with academic vocabulary and structure.',
    'fluency': 'Optimize for smooth, natural-sounding flow.',
    'academic': 'Use academic terminology and structures appropriate for scholarly work.',
    'custom': 'Be more creative with rephrasing while preserving meaning.'
  };

  const systemPrompt = `You are an expert writing assistant specializing in paraphrasing.
Rewrite the provided text in a different way while preserving its original meaning.
Style: ${styleDescriptions[style] || styleDescriptions.standard}
Provide your response in the following JSON format:
{
  "paraphrased": "The paraphrased text",
  "metrics": {
    "correctness": 85,
    "clarity": 70,
    "engagement": 80,
    "delivery": 75
  }
}
The metrics should be scores from 0-100 assessing aspects of the writing.`;

  try {
    const response = await callPerplexityAPI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7, // Higher temperature for more creative paraphrasing
    });

    // Parse the response content as JSON
    const content = response.choices[0].message.content;
    const parsedResponse = JSON.parse(content);
    return parsedResponse;
  } catch (error: any) {
    console.error('Error in paraphrasing:', error);
    throw new Error(`Failed to paraphrase text: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a humanized version of AI-generated text
 */
export async function generateHumanized(text: string, style: string = 'standard') {
  const styleDescriptions: Record<string, string> = {
    'standard': 'Make the text sound more human by adding natural variations and flow.',
    'formal': 'Humanize while maintaining formal tone suitable for professional contexts.',
    'fluency': 'Optimize for conversational flow and natural rhythm.',
    'academic': 'Humanize while preserving academic integrity and appropriate terminology.',
    'custom': 'Be creative with humanizing the text while making it sound authentic.'
  };

  const systemPrompt = `You are an expert writing assistant specializing in making AI-generated text sound more human.
Rewrite the provided text to sound more natural and human-written.
Style: ${styleDescriptions[style] || styleDescriptions.standard}
Provide your response in the following JSON format:
{
  "humanized": "The humanized text",
  "metrics": {
    "correctness": 85,
    "clarity": 70,
    "engagement": 80,
    "delivery": 75
  }
}
The metrics should be scores from 0-100 assessing aspects of the writing.`;

  try {
    const response = await callPerplexityAPI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7, // Higher temperature for more human-like variations
    });

    // Parse the response content as JSON
    const content = response.choices[0].message.content;
    const parsedResponse = JSON.parse(content);
    return parsedResponse;
  } catch (error: any) {
    console.error('Error in humanizing:', error);
    throw new Error(`Failed to humanize text: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a chat response based on conversation history
 */
export async function generateChatResponse(messages: PerplexityMessage[]): Promise<string> {
  // Prepare the messages for the API
  const systemPrompt = {
    role: 'system' as const,
    content: 'You are a helpful, friendly AI writing assistant. Provide detailed and thoughtful responses to help users with their writing needs.'
  };

  // Include system prompt at the beginning if not present
  const preparedMessages = messages[0]?.role === 'system' ? messages : [systemPrompt, ...messages];

  try {
    const response = await callPerplexityAPI({
      messages: preparedMessages,
      temperature: 0.7, // Balanced temperature for creative but coherent responses
    });

    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('Error in chat response:', error);
    throw new Error(`Failed to generate chat response: ${error?.message || 'Unknown error'}`);
  }
}

// Export function that checks if we have credentials
export const hasPerplexityCredentials = !!PERPLEXITY_API_KEY;