/**
 * Gemini API Service
 * Uses Google's Generative AI library for Gemini model integration
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, Content } from '@google/generative-ai';
import fetch from 'node-fetch';

// Get the Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check if API key is available
export const hasGeminiCredentials = !!GEMINI_API_KEY;

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY as string);

// Default model to use
const DEFAULT_MODEL = 'gemini-1.5-pro-latest';

// Cache for model instances
const modelCache: Record<string, GenerativeModel> = {};

/**
 * Convert standard message format to Google's Content format
 */
function sanitizeMessages(messages: Message[]): Content[] {
  // Extract the system message
  const systemMessage = messages.find(msg => msg.role === 'system');
  const systemPrompt = systemMessage ? systemMessage.content : 'You are a helpful writing assistant. Answer clearly and concisely.';
  
  // Get conversation history without system messages
  const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
  
  // If no user messages, return empty array
  if (userAndAssistantMessages.length === 0) {
    return [];
  }
  
  // Prepare messages that alternate between user and model
  const result: Content[] = [];
  let lastRole: string | null = null;
  
  // Process messages to ensure proper alternating format
  for (const msg of userAndAssistantMessages) {
    // Skip empty messages
    if (!msg.content.trim()) continue;
    
    const currentRole = msg.role === 'assistant' ? 'model' : 'user';
    
    // If this message has same role as previous, combine them
    if (currentRole === lastRole && result.length > 0) {
      const lastMsg = result[result.length - 1];
      if (lastMsg.parts && Array.isArray(lastMsg.parts)) {
        const lastPart = lastMsg.parts[0];
        if (typeof lastPart === 'object' && 'text' in lastPart) {
          lastPart.text += '\n\n' + msg.content;
        }
      }
    } else {
      result.push({
        role: currentRole,
        parts: [{ text: msg.content }]
      });
      lastRole = currentRole;
    }
  }
  
  return result;
}

/**
 * Get a model instance with caching
 */
function getModel(modelName: string = DEFAULT_MODEL, config?: GenerationConfig): GenerativeModel {
  const cacheKey = `${modelName}-${JSON.stringify(config || {})}`;
  
  if (!modelCache[cacheKey]) {
    modelCache[cacheKey] = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: config,
    });
  }
  
  return modelCache[cacheKey];
}

/**
 * Format messages for chat history
 */
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Call the Gemini API directly using fetch for better performance
 * This bypasses some of the library abstraction for faster responses
 */
async function callGeminiAPI(messages: Message[]): Promise<string> {
  try {
    // Extract the system message
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemPrompt = systemMessage ? systemMessage.content : 'You are a helpful writing assistant. Answer questions clearly and concisely.';
    
    // Get conversation history without system messages
    const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
    
    // If no user messages, just return a greeting
    if (userAndAssistantMessages.length === 0) {
      return "Hello! I'm your writing assistant. How can I help you today?";
    }
    
    // Prepare a simple array of messages that alternate between user and model
    // For proper formatting, ensure it starts with user and alternates correctly
    let properMessages = [];
    let lastRole = null;
    
    // Process messages to ensure proper alternating format
    for (const msg of userAndAssistantMessages) {
      // Skip empty messages
      if (!msg.content.trim()) continue;
      
      const currentRole = msg.role === 'assistant' ? 'model' : 'user';
      
      // If this message has same role as previous, combine them
      if (currentRole === lastRole && properMessages.length > 0) {
        const lastMsg = properMessages[properMessages.length - 1];
        lastMsg.parts[0].text += '\n\n' + msg.content;
      } else {
        properMessages.push({
          role: currentRole,
          parts: [{ text: msg.content }]
        });
        lastRole = currentRole;
      }
    }
    
    // Ensure conversation starts with a user message
    if (properMessages.length > 0 && properMessages[0].role !== 'user') {
      properMessages.unshift({
        role: 'user',
        parts: [{ text: 'Hello, can you help me with my writing?' }]
      });
    }
    
    // Create the final request data with appropriate configs for creative writing
    const requestData = {
      // Important: Include system prompt in a separate initial message
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        ...properMessages
      ],
      generationConfig: {
        temperature: 0.7,  // Higher temperature for more creative responses
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1200,  // Increased to allow for longer responses like scripts
        stopSequences: []
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }
      ]
    };
    
    // Make the API call with a longer timeout for creative content using streaming
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Extended to 15 seconds for creative content
    
    // Use streamGenerateContent endpoint for improved performance
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    // Process the response with text() instead of streaming
    // This is more compatible with different environments
    const responseText = await response.text();
    let completeText = '';
    
    // Process the server-sent events manually
    const lines = responseText.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const jsonStr = line.substring(6); // Remove 'data: ' prefix
          const data = JSON.parse(jsonStr);
          
          // Extract text from chunk
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            completeText += data.candidates[0].content.parts[0].text;
          }
        } catch (e) {
          console.warn('Error parsing SSE chunk:', e);
        }
      }
    }
    
    const responseTime = Date.now() - startTime;
    console.log(`Direct Gemini API streaming response received in ${responseTime}ms`);
    
    if (!completeText) {
      throw new Error('No valid content received from Gemini API');
    }
    
    return completeText;
  } catch (error) {
    console.error('Error in direct Gemini API call:', error);
    throw error;
  }
}

/**
 * Newer implementation using the Google Generative AI library as a fallback
 */
async function generateWithLibrary(messages: Message[]): Promise<string> {
  try {
    // Extract the system message
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemPrompt = systemMessage ? systemMessage.content : 'You are a helpful writing assistant. Answer clearly and concisely.';
    
    // Get user messages (excluding system)
    const userAndAssistantMessages = messages.filter(msg => msg.role !== 'system');
    
    // Quick escape for empty conversation
    if (userAndAssistantMessages.length === 0) {
      return "Hello! I'm your writing assistant. How can I help you today?";
    }
    
    // For simplicity, just use the last user message
    let lastUserMessage = "";
    for (let i = userAndAssistantMessages.length - 1; i >= 0; i--) {
      if (userAndAssistantMessages[i].role === 'user') {
        lastUserMessage = userAndAssistantMessages[i].content;
        break;
      }
    }
    
    if (!lastUserMessage) {
      lastUserMessage = "Can you help me with my writing?";
    }
    
    // Create a simple prompt combining system instructions and user request
    const fullPrompt = `${systemPrompt}\n\nUser request: ${lastUserMessage}`;
    
    // Use a simple generation call instead of chat to avoid format issues
    const model = genAI.getGenerativeModel({ 
      model: DEFAULT_MODEL,
      generationConfig: {
        temperature: 0.7,  // Match the temperature from direct API for consistency
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1200,
      }
    });
    
    // Generate the content with streaming for better performance
    const result = await model.generateContentStream(fullPrompt);
    
    // Collect the streaming response
    let responseText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      responseText += chunkText;
    }
    
    return responseText;
  } catch (error) {
    console.error('Error in library fallback:', error);
    throw error;
  }
}

/**
 * Generate a chat response based on conversation history
 */
export async function generateChatResponse(messages: Message[]): Promise<string> {
  try {
    console.log('Generating chat response with Gemini');
    
    // Quick responses for specific user inputs (mainly greetings)
    const lastUserMessage = messages.findLast(msg => msg.role === 'user')?.content || '';
    if (lastUserMessage.trim().length < 15) {
      const normalizedMessage = lastUserMessage.trim().toLowerCase();
      
      // Simple greeting detection with quick responses
      if (/^(hi|hello|hey|greetings|hi there|hello there)/.test(normalizedMessage)) {
        return "Hello! I'm your writing assistant. I can help with grammar checking, paraphrasing, humanizing text, content creation, and more. What type of writing help do you need today?";
      }
      
      if (/^(thanks|thank you|thx)/.test(normalizedMessage)) {
        return "You're welcome! Is there anything else you'd like help with?";
      }
    }
    
    // Try the direct API call first (faster)
    try {
      const response = await callGeminiAPI(messages);
      return response;
    } catch (directApiError) {
      console.warn('Direct API call failed, falling back to library:', directApiError);
      
      // Try the library method as fallback
      try {
        const response = await generateWithLibrary(messages);
        return response;
      } catch (libraryError) {
        console.error('All Gemini methods failed:', libraryError);
        
        // Simplified fallback response if everything fails
        return "I'm experiencing some technical difficulties right now. Could you try again with a more specific writing-related question?";
      }
    }
  } catch (error: any) {
    console.error('Error in Gemini chat response:', error);
    return "I'm having trouble connecting to my knowledge source right now. Please try again with a specific writing question.";
  }
}

/**
 * Generate a streaming chat response based on conversation history
 * @param messages The conversation messages
 * @param onChunk Callback that's called with each chunk of text as it's generated
 * @returns The complete response when finished
 */
export async function generateChatResponseWithStreaming(
  messages: Message[], 
  onChunk: (text: string) => void
): Promise<string> {
  try {
    console.log('Generating streaming chat response with Gemini');
    
    // Quick responses for specific user inputs
    const lastUserMessage = messages.findLast(msg => msg.role === 'user')?.content || '';
    if (lastUserMessage.trim().length < 15) {
      const normalizedMessage = lastUserMessage.trim().toLowerCase();
      
      // Simple greeting detection with quick responses
      if (/^(hi|hello|hey|greetings|hi there|hello there)/.test(normalizedMessage)) {
        const response = "Hello! I'm your writing assistant. I can help with grammar checking, paraphrasing, humanizing text, content creation, and more. What type of writing help do you need today?";
        onChunk(response);
        return response;
      }
      
      if (/^(thanks|thank you|thx)/.test(normalizedMessage)) {
        const response = "You're welcome! Is there anything else you'd like help with?";
        onChunk(response);
        return response;
      }
    }
    
    // Format Gemini API message format
    const sanitizedMessages = sanitizeMessages(messages);
    let userRequest = '';
    if (sanitizedMessages.length > 0) {
      userRequest = sanitizedMessages[sanitizedMessages.length - 1].parts?.[0]?.text || '';
    }
    
    // If messages are empty after sanitation, send a fallback
    if (!userRequest) {
      const fallback = "I'm not sure what you're asking. Could you provide more details about your writing needs?";
      onChunk(fallback);
      return fallback;
    }

    try {
      // First try real streaming with the library
      const model = genAI.getGenerativeModel({ 
        model: DEFAULT_MODEL,
        generationConfig: {
          temperature: 0.7,  // Match the direct API temp
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1200,
        }
      });
      
      // Create complete chat context using multi-turn history
      // We'll format it as a prompt to preserve full context
      const chat = model.startChat({
        history: sanitizedMessages.slice(0, -1) || [],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 1200,
        },
      });
      
      // Generate streaming response
      const result = await chat.sendMessageStream([{text: userRequest}]);
      
      // Process the stream - send INCREMENTAL chunks
      let fullResponse = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          // Send only the new chunk, not the accumulated text
          // This allows the client to control accumulation
          onChunk(chunkText);
        }
      }
      
      return fullResponse;
    } catch (streamingError) {
      console.error('Streaming with library failed:', streamingError);
      
      // Fall back to direct API
      try {
        const response = await callGeminiAPI(messages);
        onChunk(response);
        return response;
      } catch (directApiError) {
        console.error('Direct API also failed:', directApiError);
        
        // Last resort fallback
        const fallback = "I'm experiencing some technical difficulties right now. Could you try again with a more specific writing-related question?";
        onChunk(fallback);
        return fallback;
      }
    }
  } catch (error: any) {
    console.error('Error in Gemini streaming response:', error);
    const errorMsg = "I'm having trouble connecting to my knowledge source right now. Please try again with a specific writing question.";
    onChunk(errorMsg);
    return errorMsg;
  }
}

/**
 * Generate text completion with a system prompt and user text
 */
async function generateCompletion(systemPrompt: string, userText: string, temperature = 0.7): Promise<string> {
  try {
    // Get the model with specified temperature
    const model = getModel(DEFAULT_MODEL, {
      temperature,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    });
    
    // Combine system prompt and user text
    const prompt = `${systemPrompt}\n\n${userText}`;
    
    // Generate content using streaming for better performance
    const result = await model.generateContentStream(prompt);
    
    // Collect the streaming response
    let responseText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      responseText += chunkText;
    }
    
    return responseText;
  } catch (error: any) {
    console.error('Error in Gemini completion:', error);
    throw new Error(`Failed to generate completion: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate grammar check for text
 */
export async function generateGrammarCheck(text: string) {
  const systemPrompt = `You are an expert grammar and writing assistant. 
Analyze the provided text for grammar, punctuation, style, and clarity issues.
IMPORTANT: Provide your response as a raw, valid JSON object with no markdown formatting, no extra text, and no explanation outside the JSON object.

Analyze position and indexes of errors in the text carefully. For example, if "i" should be "I", find the exact position.
If you find capitalization errors, punctuation errors, or spelling errors, add them to the errors array, not just suggestions.

Respond with ONLY the following JSON format:
{
  "errors": [
    {
      "id": "unique-id-1",
      "type": "grammar|punctuation|style|clarity|capitalization",
      "errorText": "the original text with the error",
      "replacementText": "suggested correction",
      "description": "brief explanation of the error and correction",
      "position": {
        "start": 0,
        "end": 10
      }
    }
  ],
  "suggestions": [
    {
      "id": "unique-id-2",
      "type": "wordChoice|structure|clarity|conciseness",
      "originalText": "original text that could be improved",
      "suggestedText": "improved version",
      "description": "reason for the suggestion"
    }
  ],
  "metrics": {
    "correctness": 85,
    "clarity": 70,
    "engagement": 80,
    "delivery": 75
  }
}

METRICS SCORING GUIDELINES:
- Correctness: Start at 100 and subtract 5-20 points per error depending on severity
- Clarity: Start at 80 and adjust based on how easy the text is to understand
- Engagement: Start at 70 and adjust based on how interesting the content is
- Delivery: Start at 75 and adjust based on flow and style
- NEVER return scores of 0 for any category - minimum value should be 20
- For capitalization errors like lowercase 'i' that should be uppercase 'I', reduce correctness by 20 points
- Subject-verb agreement errors like "I is" instead of "I am" should reduce correctness by 30 points
- Spelling errors should reduce correctness by 10-15 points each`;

  try {
    // Find common grammar errors before API call
    const lowercaseIPattern = /(\s|^)i(\s|$|\.|,|;|:|\?|!)/g;
    const subjectVerbAgreementPattern = /(\s|^)I\s+is(\s|$|\.|,|;|:|\?|!)/g;
    
    let localErrors = [];
    
    // Check for lowercase "i" as a standalone pronoun and add it as an error
    let match;
    while ((match = lowercaseIPattern.exec(text)) !== null) {
      const errorStart = match.index + match[1].length;
      const errorEnd = errorStart + 1;
      
      localErrors.push({
        id: `cap-${errorStart}`,
        type: "capitalization",
        errorText: "i",
        replacementText: "I",
        description: "The pronoun 'I' should always be capitalized.",
        position: {
          start: errorStart,
          end: errorEnd
        }
      });
    }
    
    // Check for "I is" subject-verb agreement errors
    let svMatch;
    while ((svMatch = subjectVerbAgreementPattern.exec(text)) !== null) {
      const errorStart = svMatch.index + svMatch[1].length;
      const errorEnd = errorStart + 4; // 'I is'
      
      localErrors.push({
        id: `sva-${errorStart}`,
        type: "grammar",
        errorText: "I is",
        replacementText: "I am",
        description: "Subject-verb agreement error. The first-person singular pronoun 'I' should be followed by 'am', not 'is'.",
        position: {
          start: errorStart,
          end: errorEnd
        }
      });
    }

    // Get response from Gemini
    const response = await generateCompletion(systemPrompt, text, 0.2);
    
    try {
      // Try to parse as JSON
      const parsedResponse = JSON.parse(response);
      
      // Merge local errors with API errors if successful
      if (parsedResponse && parsedResponse.errors && parsedResponse.suggestions && parsedResponse.metrics) {
        const allErrors = [...localErrors, ...parsedResponse.errors];
        
        // Update metrics if we found local errors but API didn't
        if (localErrors.length > 0 && parsedResponse.errors.length === 0) {
          parsedResponse.metrics.correctness = Math.max(20, Math.min(100, parsedResponse.metrics.correctness - 20));
        }
        
        return {
          ...parsedResponse,
          errors: allErrors
        };
      }
      
      return parsedResponse;
    } catch (jsonError) {
      console.warn("JSON parsing failed for grammar check, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          
          // Merge local errors with API errors
          if (extractedJson && extractedJson.errors) {
            const allErrors = [...localErrors, ...extractedJson.errors];
            return {
              ...extractedJson,
              errors: allErrors
            };
          }
          
          return extractedJson;
        } catch (extractError) {
          console.error("Failed to extract valid JSON for grammar check:", extractError);
        }
      }
      
      // Generate fallback response based on local errors
      const errorCount = localErrors.length;
      const fallbackMetrics = {
        correctness: errorCount > 0 ? Math.max(20, 100 - (errorCount * 20)) : 100,
        clarity: errorCount > 0 ? Math.max(30, 90 - (errorCount * 15)) : 90,
        engagement: errorCount > 0 ? Math.max(40, 85 - (errorCount * 10)) : 85,
        delivery: errorCount > 0 ? Math.max(35, 90 - (errorCount * 15)) : 90
      };
      
      return {
        errors: localErrors,
        suggestions: localErrors.map(error => ({
          id: `sugg-${error.id}`,
          type: error.type,
          originalText: error.errorText,
          suggestedText: error.replacementText,
          description: error.description
        })),
        metrics: fallbackMetrics
      };
    }
  } catch (error: any) {
    console.error('Error in grammar check:', error);
    throw new Error(`Failed to check grammar: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate paraphrased text
 */
export async function generateParaphrase(text: string, style: string = 'standard', customTone?: string) {
  const styleDescriptions: Record<string, string> = {
    'standard': 'Maintain the original tone while rewording for clarity. Example: "This is important" → "This matter is significant"',
    'formal': 'Use more formal language with academic vocabulary and structure. Example: "I think" → "It is proposed that", "We did this" → "This action was undertaken"',
    'fluency': 'Optimize for smooth, natural-sounding flow. Example: "The system processes data" → "Data flows smoothly through the system"',
    'academic': 'Use academic terminology and structures appropriate for scholarly work. Example: "This shows" → "This evidence demonstrates", "We found" → "The findings indicate"',
    'custom': 'Be more creative with rephrasing while preserving meaning. Follow the specified tone exactly.'
  };

  // For custom style, use the provided tone description if available
  const styleDescription = style === 'custom' && customTone 
    ? `Use a ${customTone} tone while preserving the meaning.` 
    : styleDescriptions[style] || styleDescriptions.standard;
  
  // Make the style more prominent in the prompt
  const stylePrefix = style === 'custom' && customTone 
    ? `[CUSTOM TONE: ${customTone.toUpperCase()}]` 
    : `[STYLE: ${style.toUpperCase()}]`;

  const systemPrompt = `You are an expert writing assistant specializing in paraphrasing.
${stylePrefix} 
Rewrite the provided text in a different way while preserving its original meaning.
VERY IMPORTANT: Use the ${style === 'custom' ? customTone : style} style for paraphrasing.
Style description: ${styleDescription}
IMPORTANT: Provide your response as a raw, valid JSON object with no markdown formatting, no extra text, and no explanation outside the JSON object.
Respond with ONLY the following JSON format:
{
  "paraphrased": "The paraphrased text",
  "metrics": {
    "correctness": 85,
    "clarity": 70,
    "engagement": 80,
    "delivery": 75
  }
}

METRICS SCORING GUIDELINES:
- Correctness: Rate how well the paraphrased text preserves the original meaning (50-100)
- Clarity: Rate how clear and understandable the paraphrased text is (50-100)
- Engagement: Rate how engaging and interesting the paraphrased text is (50-100)
- Delivery: Rate how well the paraphrased text flows and sounds natural (50-100)
- NEVER return scores of 0 for any category - minimum value should be 50`;

  try {
    // Adjust temperature based on style - higher for creative styles
    let temperature = 0.7; // Default
    if (style === 'fluency') temperature = 0.8;
    if (style === 'academic') temperature = 0.5; // More controlled for academic
    if (style === 'formal') temperature = 0.6;
    if (style === 'custom') temperature = 0.9; // Most creative for custom
    
    // Get response from Gemini
    const response = await generateCompletion(systemPrompt, text, temperature);
    
    try {
      // Try to parse as JSON
      const parsedResponse = JSON.parse(response);
      return parsedResponse;
    } catch (jsonError) {
      console.warn("JSON parsing failed for paraphrase, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson;
        } catch (extractError) {
          console.error("Failed to extract valid JSON for paraphrase:", extractError);
        }
      }
      
      // Try to extract just the text between the "paraphrased" property quotes
      const paraphrasedMatch = response.match(/"paraphrased"\s*:\s*"([\s\S]*?)(?<!\\)"/);
      if (paraphrasedMatch && paraphrasedMatch[1]) {
        // We found the text inside the paraphrased property
        return {
          paraphrased: paraphrasedMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
          metrics: {
            correctness: 75,
            clarity: 75,
            engagement: 75,
            delivery: 75
          }
        };
      }
      
      // If we couldn't extract the paraphrased text, use the raw content
      return {
        paraphrased: response,
        metrics: {
          correctness: 50,
          clarity: 50,
          engagement: 50,
          delivery: 50
        }
      };
    }
  } catch (error: any) {
    console.error('Error in paraphrasing:', error);
    throw new Error(`Failed to paraphrase text: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate humanized version of AI-generated text that won't be detected by AI checkers
 */
export async function generateHumanized(text: string, style: string = 'standard', customTone?: string) {
  const styleDescriptions: Record<string, string> = {
    'standard': 'Transform the text to sound genuinely human, with natural speech patterns, contractions, occasional sentence fragments, casual transitions, and imperfect grammar at times. Include occasional parenthetical thoughts and use varied sentence structure. Example: "The data is analyzed" → "I went through the data and noticed (actually, this surprised me) several interesting patterns."',
    'formal': 'Rewrite with human touches while maintaining professionalism - vary sentence length, use occasional first-person perspective, and add thoughtful transitions. Example: "This shows results" → "As we can see from these findings, the results point to several key insights."',
    'fluency': 'Make it conversational with casual transitions, contractions, parenthetical thoughts, and natural flow. Example: "It was determined that" → "So I figured out that..." or "What we found, which was actually pretty interesting, was that..."',
    'academic': 'Add human elements like occasional hedging, personal perspective, and varied citations while preserving academic integrity. Example: "The study shows" → "From my analysis of the literature, this research suggests" or "The evidence appears to indicate"',
    'custom': 'Completely transform this text to sound authentically human in exactly the specified tone, with natural imperfections, varied sentence structures, and idiomatic expressions.'
  };

  // For custom style, use the provided tone description if available
  const styleDescription = style === 'custom' && customTone 
    ? `Use a ${customTone} tone while making the text sound authentically human and undetectable by AI checkers.` 
    : styleDescriptions[style] || styleDescriptions.standard;
    
  // Make the style more prominent in the prompt
  const stylePrefix = style === 'custom' && customTone 
    ? `[CUSTOM TONE: ${customTone.toUpperCase()}]` 
    : `[STYLE: ${style.toUpperCase()}]`;

  const systemPrompt = `You are an expert writing coach specializing in making text sound authentically human and UNDETECTABLE by AI content checkers.

${stylePrefix}

Your task is to completely transform the provided AI-generated text to sound genuinely human-written in a way that will pass AI detection tools.

CRITICAL INSTRUCTIONS:
1. Introduce natural human imperfections - include occasional run-on sentences, contractions (don't, I'm, you're), sentence fragments, off-topic asides, and self-corrections
2. Vary sentence lengths dramatically - mix very short sentences with occasional long ones
3. Use informal transitions like "anyway", "so", "actually", "you know", "honestly", "I mean"
4. Add personal touches like "personally", "in my experience", "I've found that", "to be honest"
5. Incorporate rhetorical questions, especially when transitioning to new points
6. Include occasional tangential thoughts in parentheses (these make text seem more spontaneous)
7. Use casual punctuation in places - occasional exclamation points, em dashes, or ellipses...
8. Incorporate idioms, metaphors, and colloquialisms that AI typically won't generate
9. DON'T be too perfect or consistent, humans rarely are

Style specifics: ${styleDescription}

IMPORTANT: Final output should sound completely natural and human, avoiding ANY patterns that AI detectors look for. Make extensive changes to phrasing, structure, and organization.

IMPORTANT: Provide your response as a raw, valid JSON object with no markdown formatting, no extra text, and no explanation outside the JSON object.
Respond with ONLY the following JSON format:
{
  "humanized": "The humanized text",
  "metrics": {
    "correctness": 85,
    "clarity": 70,
    "engagement": 80,
    "delivery": 75
  }
}

METRICS SCORING GUIDELINES:
- Correctness: Rate how well the humanized text preserves the original meaning (50-100)
- Clarity: Rate how clear and understandable the humanized text is (50-100)
- Engagement: Rate how engaging and interesting the humanized text is (50-100)
- Delivery: Rate how well the humanized text flows and sounds natural (50-100)
- NEVER return scores of 0 for any category - minimum value should be 50`;

  try {
    // Higher temperatures for more randomness and creativity to avoid AI detection patterns
    let temperature = 0.85; // Higher default for all humanization
    if (style === 'fluency') temperature = 0.92;
    if (style === 'academic') temperature = 0.75; // Still higher than before, but more controlled for academic
    if (style === 'formal') temperature = 0.8;
    if (style === 'custom') temperature = 0.95; // Very high for maximum randomness and creativity
    
    // Get response from Gemini
    const response = await generateCompletion(systemPrompt, text, temperature);
    
    try {
      // Try to parse as JSON
      const parsedResponse = JSON.parse(response);
      return parsedResponse;
    } catch (jsonError) {
      console.warn("JSON parsing failed for humanize, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson;
        } catch (extractError) {
          console.error("Failed to extract valid JSON for humanize:", extractError);
        }
      }
      
      // Try to extract just the text between the "humanized" property quotes
      const humanizedMatch = response.match(/"humanized"\s*:\s*"([\s\S]*?)(?<!\\)"/);
      if (humanizedMatch && humanizedMatch[1]) {
        // We found the text inside the humanized property
        return {
          humanized: humanizedMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
          metrics: {
            correctness: 75,
            clarity: 75,
            engagement: 75,
            delivery: 75
          }
        };
      }
      
      // If we couldn't extract the humanized text, use the raw content
      return {
        humanized: response,
        metrics: {
          correctness: 50,
          clarity: 50,
          engagement: 50,
          delivery: 50
        }
      };
    }
  } catch (error: any) {
    console.error('Error in humanizing:', error);
    throw new Error(`Failed to humanize text: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Detect if text was written by AI
 */
export async function detectAiContent(text: string) {
  const systemPrompt = `You are an expert AI content detector. Analyze the provided text and determine if it was likely written by an AI model or a human.
IMPORTANT: Provide your response as a raw, valid JSON object with no markdown formatting, no extra text, and no explanation outside the JSON object.

For your analysis, focus on:
1. Repetitive patterns or phrasing
2. Unnatural transitions or coherence issues
3. Overly formal or consistent tone throughout
4. Lack of personal voice or anecdotes
5. Formulaic structure typical of AI responses

Respond with ONLY the following JSON format:
{
  "aiPercentage": 75,
  "highlights": [
    {
      "id": "highlight-1",
      "position": {
        "start": 25,
        "end": 45
      },
      "message": "This phrase has patterns common in AI writing"
    }
  ],
  "metrics": {
    "correctness": 80,
    "clarity": 75,
    "engagement": 65,
    "delivery": 70
  }
}

The aiPercentage should be a number between 0 and 100, where higher values indicate more likely AI-generated content.
Include at least 2-3 highlights for texts longer than 100 words if you detect AI patterns.
Metrics should reflect the overall quality regardless of whether it's AI or human-written.`;

  try {
    // Get response from Gemini with low temperature for consistent analysis
    const response = await generateCompletion(systemPrompt, text, 0.1);
    
    try {
      // Try to parse as JSON
      const parsedResponse = JSON.parse(response);
      return parsedResponse;
    } catch (jsonError) {
      console.warn("JSON parsing failed for AI detection, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson;
        } catch (extractError) {
          console.error("Failed to extract valid JSON for AI detection:", extractError);
        }
      }
      
      // Extract the AI percentage using regex if JSON parsing fails
      const percentMatch = response.match(/(\d+)%|"aiPercentage"\s*:\s*(\d+)/);
      const aiPercentage = percentMatch 
        ? parseInt(percentMatch[1] || percentMatch[2], 10) 
        : 50; // Default to 50% if we can't determine
      
      return {
        aiPercentage,
        highlights: [],
        metrics: {
          correctness: 70,
          clarity: 70,
          engagement: 70,
          delivery: 70
        }
      };
    }
  } catch (error: any) {
    console.error('Error in AI detection:', error);
    throw new Error(`Failed to detect AI content: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate writing based on parameters
 */
export async function generateWriting(params: {
  originalSample: string;
  referenceUrl?: string;
  topic: string;
  length?: string;
  style?: string;
  additionalInstructions?: string;
}) {
  // Create a detailed prompt for the language model
  const prompt = `Please write content on the following topic: ${params.topic}
${params.originalSample ? `Here's a sample for reference: ${params.originalSample}` : ''}
${params.referenceUrl ? `Reference URL for information: ${params.referenceUrl}` : ''}
${params.length ? `Length: ${params.length}` : 'Length: Medium (300-500 words)'}
${params.style ? `Style: ${params.style}` : 'Style: Informative and engaging'}
${params.additionalInstructions ? `Additional instructions: ${params.additionalInstructions}` : ''}`;

  const systemPrompt = `You are an expert content writer. Write high-quality, engaging content based on the user's requirements.
Focus on creating original, well-structured text that fulfills all the requested parameters.
Provide your response as plaintext content, with no preamble or explanations, just the generated writing.`;

  try {
    // Get response from Gemini
    const generatedText = await generateCompletion(systemPrompt, prompt, 0.7);
    
    return { generatedText };
  } catch (error: any) {
    console.error('Error in content generation:', error);
    throw new Error(`Failed to generate content: ${error?.message || 'Unknown error'}`);
  }
}