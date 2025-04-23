/**
 * Cloudflare Workers AI API utility for accessing Llama models
 */

import { Ai } from '@cloudflare/ai';

// We'll need a Cloudflare account ID and API token to use their AI service
// These would be provided by the user as environment variables
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Check if credentials are available and warn if not
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
  console.warn('CLOUDFLARE_ACCOUNT_ID and/or CLOUDFLARE_API_TOKEN not set. Some AI features may not work.');
}

// Initialize Cloudflare AI client
const getAiClient = () => {
  return new Ai(CLOUDFLARE_ACCOUNT_ID, {
    token: CLOUDFLARE_API_TOKEN,
  });
};

// The latest Llama model available through Cloudflare Workers AI
const LLAMA_MODEL = 'llama-3.1-sonar-small-128k-online';

/**
 * Generate text using Llama model via Cloudflare AI
 * @param prompt The text prompt to send to the model
 * @param options Configuration options for the generation
 * @returns The generated text response
 */
export async function generateLlamaResponse(
  prompt: string, 
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  try {
    // Use default values if not specified
    const maxTokens = options.maxTokens || 1024;
    const temperature = options.temperature || 0.7;
    
    // If no API credentials are available, use a fallback
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.warn('Using Gemini API as fallback due to missing Cloudflare credentials');
      // Try to use Gemini as fallback if available
      if (process.env.GEMINI_API_KEY) {
        const { generateGeminiResponse } = require('./gemini-api');
        return await generateGeminiResponse(prompt, maxTokens);
      } else {
        throw new Error('No AI API credentials available (Cloudflare or Gemini)');
      }
    }
    
    const ai = getAiClient();
    
    // Call the Llama model using Cloudflare AI
    const response = await ai.run(LLAMA_MODEL, {
      prompt,
      max_tokens: maxTokens,
      temperature,
    });
    
    return response.response || '';
  } catch (error) {
    console.error('Error generating Llama response:', error);
    
    // If Cloudflare AI fails, try Gemini as fallback
    if (process.env.GEMINI_API_KEY) {
      console.log('Attempting fallback to Gemini API');
      try {
        const { generateGeminiResponse } = require('./gemini-api');
        return await generateGeminiResponse(prompt, options.maxTokens || 1024);
      } catch (fallbackError) {
        console.error('Fallback to Gemini also failed:', fallbackError);
      }
    }
    
    // Return a clear error message if all attempts fail
    return `Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Generate chat completion using Llama model via Cloudflare AI
 * @param messages Array of chat messages with role and content
 * @param options Configuration options for the generation
 * @returns The generated response text
 */
export async function generateLlamaChatResponse(
  messages: { role: string; content: string }[],
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  try {
    // Format messages for the Cloudflare AI chat completion
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // If no API credentials are available, use a fallback
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.warn('Using Gemini API as fallback for chat due to missing Cloudflare credentials');
      
      // Create a single prompt from chat history as fallback
      const chatHistory = messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      const prompt = `
      You are a helpful AI writing assistant. Your role is to help users with their writing needs,
      including drafting content, improving grammar and style, and answering questions about writing.
      
      Here is the conversation history so far:
      ${chatHistory}
      
      Please provide your next response as the AI writing assistant.
      `;
      
      return await generateLlamaResponse(prompt, options);
    }
    
    const ai = getAiClient();
    
    // Use the chat completions endpoint with Llama
    const response = await ai.run('@cf/llama/chat', {
      messages: formattedMessages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
    });
    
    return response.response || '';
  } catch (error) {
    console.error('Error generating Llama chat response:', error);
    
    // Return a clear error message
    return `Failed to generate chat response: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}