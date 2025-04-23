/**
 * Simplified API utility for accessing Llama models through HTTP fetch
 * Doesn't rely on the @cloudflare/ai package to avoid dependency issues
 */

// We'll need a Cloudflare account ID and API token to use their AI service
// These would be provided by the user as environment variables
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// Check if credentials are available and warn if not
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
  console.warn('CLOUDFLARE_ACCOUNT_ID and/or CLOUDFLARE_API_TOKEN not set. Some AI features may not work.');
}

// The latest Llama model available through Cloudflare Workers AI
const LLAMA_MODEL = '@cf/meta/llama-3-8b-instruct';
const PERPLEXITY_MODEL = 'llama-3.1-sonar-small-128k-online';

/**
 * Generate text using Llama model via direct HTTP call to Cloudflare AI
 * @param prompt The text prompt to send to the model
 * @param maxTokens Maximum number of tokens to generate
 * @returns The generated text response
 */
export async function generateLlamaResponse(
  prompt: string, 
  maxTokens: number = 1024
): Promise<string> {
  try {
    // If no Cloudflare credentials are available, try using Gemini as fallback
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      if (process.env.GEMINI_API_KEY) {
        console.warn('Using Gemini API as fallback due to missing Cloudflare credentials');
        try {
          // Import dynamically to avoid errors if file doesn't exist
          const geminiModule = await import('./gemini-api');
          return await geminiModule.generateGeminiResponse(prompt, maxTokens);
        } catch (error) {
          console.error('Error using Gemini fallback:', error);
        }
      }
      
      // If Perplexity API key is available, try using that
      if (process.env.PERPLEXITY_API_KEY) {
        console.warn('Using Perplexity API as fallback due to missing Cloudflare credentials');
        return await generatePerplexityResponse(prompt, maxTokens);
      }
      
      // If no alternatives available, use a default response
      return "I'm having trouble connecting to my AI service. Please check that your CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables are set correctly.";
    }
    
    // Call the Cloudflare AI API directly with fetch
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${LLAMA_MODEL}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`Cloudflare AI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the response text from the response object
    if (data && typeof data === 'object') {
      if (data.result && typeof data.result === 'string') {
        return data.result;
      } else if (data.result?.response && typeof data.result.response === 'string') {
        return data.result.response;
      } else if (data.response && typeof data.response === 'string') {
        return data.response;
      } else if (data.output && typeof data.output === 'string') {
        return data.output;
      }
    }
    
    return JSON.stringify(data) || '';
  } catch (error) {
    console.error('Error generating Llama response:', error);
    
    // Try fallbacks in case of Cloudflare error
    if (process.env.GEMINI_API_KEY) {
      console.log('Attempting fallback to Gemini API');
      try {
        // Import dynamically to avoid errors if file doesn't exist
        const geminiModule = await import('./gemini-api');
        return await geminiModule.generateGeminiResponse(prompt, maxTokens);
      } catch (fallbackError) {
        console.error('Fallback to Gemini also failed:', fallbackError);
      }
    }
    
    if (process.env.PERPLEXITY_API_KEY) {
      console.log('Attempting fallback to Perplexity API');
      try {
        return await generatePerplexityResponse(prompt, maxTokens);
      } catch (fallbackError) {
        console.error('Fallback to Perplexity also failed:', fallbackError);
      }
    }
    
    // Return a clear error message if all attempts fail
    return `Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Generate a response using the Perplexity API
 */
async function generatePerplexityResponse(prompt: string, maxTokens: number = 1024): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY environment variable is not set');
  }
  
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: "system",
          content: "Be precise and concise."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.2
    })
  });
  
  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate chat completion using Llama model via direct HTTP call
 * @param messages Array of chat messages with role and content
 * @param maxTokens Maximum number of tokens to generate
 * @returns The generated response text
 */
export async function generateLlamaChatResponse(
  messages: { role: string; content: string }[],
  maxTokens: number = 1024
): Promise<string> {
  try {
    // Format messages for the Cloudflare AI chat completion
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // If no API credentials are available, use a fallback approach
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.warn('Using alternative method for chat due to missing Cloudflare credentials');
      
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
      
      return await generateLlamaResponse(prompt, maxTokens);
    }
    
    // Call the Cloudflare AI API directly with fetch
    const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${LLAMA_MODEL}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: formattedMessages,
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`Cloudflare AI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the response text from the response object
    if (data && typeof data === 'object') {
      if (data.result && typeof data.result === 'string') {
        return data.result;
      } else if (data.result?.response && typeof data.result.response === 'string') {
        return data.result.response;
      } else if (data.response && typeof data.response === 'string') {
        return data.response;
      } else if (data.output && typeof data.output === 'string') {
        return data.output;
      }
    }
    
    return JSON.stringify(data) || '';
  } catch (error) {
    console.error('Error generating Llama chat response:', error);
    
    // Try to use the simple text completion as a fallback
    try {
      // Create a single prompt from chat history
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
      
      return await generateLlamaResponse(prompt, maxTokens);
    } catch (fallbackError) {
      console.error('Fallback chat approach also failed:', fallbackError);
      return "I'm sorry, I'm having trouble generating a response right now. Please try again later.";
    }
  }
}