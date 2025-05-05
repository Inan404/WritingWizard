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
    const systemPrompt = systemMessage ? systemMessage.content : 'You are a helpful writing assistant. Answer questions clearly and concisely. Format your responses using markdown with headings (##), bold (**text**), italics (*text*), and bullet points when appropriate.';
    
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
      
      // Process the stream
      let fullResponse = '';
      let lastChunk = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        
        // Add current chunk to full response
        fullResponse += chunkText;
        
        // Ensure we're only sending the new portion, not the entire accumulated text
        // This prevents the client from seeing duplicate text
        onChunk(chunkText);
        
        lastChunk = chunkText;
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
 * Generate text completion with streaming updates
 * This version calls the callback with each chunk as it's generated
 */
async function generateCompletionWithStreaming(
  systemPrompt: string, 
  userText: string,
  onChunk: (text: string) => void,
  temperature = 0.7
): Promise<string> {
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
    
    // Generate content using streaming
    const result = await model.generateContentStream(prompt);
    
    // Storage for collecting all chunks for the final response
    let fullText = '';
    let currentBuffer = '';
    let jsonStarted = false;
    let jsonEndIndex = -1;
    
    // Process the stream
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      currentBuffer += chunkText;
      
      // Try to extract valid JSON as chunks come in
      if (!jsonStarted && currentBuffer.includes('{')) {
        jsonStarted = true;
      }
      
      if (jsonStarted) {
        try {
          // Look for a complete JSON object
          jsonEndIndex = -1;
          let openBraces = 0;
          let insideString = false;
          let escapeNext = false;
          
          for (let i = 0; i < currentBuffer.length; i++) {
            const char = currentBuffer[i];
            
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            
            if (char === '\\' && insideString) {
              escapeNext = true;
              continue;
            }
            
            if (char === '"' && !escapeNext) {
              insideString = !insideString;
              continue;
            }
            
            if (!insideString) {
              if (char === '{') openBraces++;
              if (char === '}') {
                openBraces--;
                if (openBraces === 0) {
                  jsonEndIndex = i;
                  break;
                }
              }
            }
          }
          
          // If we found a complete JSON object
          if (jsonEndIndex !== -1) {
            const jsonStr = currentBuffer.substring(0, jsonEndIndex + 1);
            try {
              const jsonObj = JSON.parse(jsonStr);
              
              // Extract the relevant text field
              if (jsonObj.humanizedText) {
                onChunk(jsonObj.humanizedText);
                return fullText; // We found our result, return early
              } else if (jsonObj.paraphrased) {
                onChunk(jsonObj.paraphrased);
                return fullText; // We found our result, return early
              }
            } catch (e) {
              // Ignore JSON parsing errors on incomplete chunks
            }
          }
        } catch (e) {
          // Ignore errors in streaming processing
        }
      }
      
      // If we couldn't find JSON, treat as raw text for streaming
      onChunk(chunkText);
    }
    
    return fullText;
  } catch (error: any) {
    console.error('Error in Gemini streaming completion:', error);
    const errorMsg = `Failed to generate completion: ${error?.message || 'Unknown error'}`;
    onChunk(errorMsg);
    return errorMsg;
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
    'standard': 'Transform the text to sound like it was written by a real person, not an AI. Use casual language, contractions, varied sentence lengths (mix very short sentences with longer ones), and natural phrasing. Add everyday expressions, slight imperfections, and write the way a person would honestly explain their thoughts in a blog post. Include parenthetical thoughts (these make text seem more spontaneous) and occasional self-corrections. Example: "The data is analyzed" → "I went through the data and noticed (actually, this surprised me) several interesting patterns."',
    
    'formal': 'Rewrite with human touches while maintaining professionalism - vary sentence length, use occasional first-person perspective, add thoughtful transitions, and include subtle opinion markers like "in my assessment" or "it seems reasonable to conclude." Avoid casual language and slang. Use precise vocabulary and well-structured arguments, but with natural human elements like occasional hedging ("it appears that") and measured personal insights. Imagine you\'re a thoughtful professional speaking to colleagues, not writing a report. Example: "This shows results" → "As we can see from these findings, the results point to several key insights that, in my professional opinion, warrant further consideration."',
    
    'fluency': 'Make it sound like someone casually talking to a close friend - use LOTS of casual transitions, abundant contractions, parenthetical thoughts, and very natural flow with occasional repetition. Add conversational fillers like "you know," "I mean," and "like" somewhat frequently, and include mid-sentence restarts and tangents. Use informal language, slang expressions, and emotional reactions. This should sound like an unedited transcript of someone speaking spontaneously. Example: "It was determined that" → "So I figured out that... well, actually, what we found, which was pretty interesting, was that... you know what I mean? Like, it really jumped out at us that..."',
    
    'academic': 'Write like a college professor speaking to students or colleagues - add human elements like occasional hedging, personal perspective, and varied citations while preserving academic integrity. Include moments of first-person reflection, rhetorical questions, and phrases like "I would argue" or "this finding suggests to me." Use sophisticated vocabulary and precise terms, but avoid excessive jargon. Maintain formal structure with clear thesis statements and topic sentences, but insert occasional personal insights or measured opinions. Example: "The study shows" → "From my analysis of the literature, this research suggests—and I find this particularly noteworthy—that the variables have a complex relationship. One might reasonably question, however, whether additional factors are at play."',
    
    'custom': 'Completely transform this text to sound authentically human in exactly the specified tone. Avoid sounding like an AI. Break up long sentences, use everyday language, and write the way a person would talk. Keep it real and slightly imperfect with natural imperfections, varied sentence structures, idiomatic expressions, and subtle inconsistencies that AI detection systems cannot easily identify. Example: "The analysis indicates" → Write this in the exact style specified, with all the quirks, speech patterns, vocabulary choices, and structural tendencies that would make it instantly recognizable as coming from this specific type of person.'
  };

  // For custom style, use the provided tone description if available and enhance it with style anchors
  const styleDescription = style === 'custom' && customTone 
    ? `Imagine you ARE ${customTone} writing this text. You must PRECISELY match their tone, vocabulary, sentence patterns, and personality quirks. Analyze exactly how ${customTone} would express these ideas - what unique phrases would they use? What life experiences or references would they mention? How would they structure their thoughts? Include their characteristic expressions, speech patterns, and perspective. Every sentence should feel like it could ONLY have been written by ${customTone}, not a generic imitation. This is not just "writing like" them - it's fully embodying their voice while making the text sound authentically human and completely undetectable by AI checkers.` 
    : styleDescriptions[style] || styleDescriptions.standard;
    
  // Make the style more prominent in the prompt
  const stylePrefix = style === 'custom' && customTone 
    ? `[CUSTOM STYLE ANCHOR: WRITE LIKE ${customTone.toUpperCase()}]` 
    : `[STYLE: ${style.toUpperCase()}]`;

  // Adjusting temperature and other generation parameters based on style
  // Each style uses a different temperature to make the differences more distinct
  let temperature = 0.9; // Default for standard style (high randomness for creativity)
  let topK = 40; // Narrows word choices slightly, still diverse
  let topP = 0.95; // Keeps natural variability, limits outlier tokens
  
  // Make the style differences more prominent by using more varied temperature settings
  if (style === 'academic') {
    temperature = 0.65; // Less randomness for academic tone (precise, structured)
    topP = 0.85; // More focused word selection for academic writing
  } else if (style === 'formal') {
    temperature = 0.75; // Moderate randomness for formal tone
    topP = 0.9; // Slightly more focused word selection
  } else if (style === 'fluency') {
    temperature = 0.95; // High randomness for fluent, conversational tone
    topP = 0.98; // Very wide word selection for natural speech patterns
  } else if (style === 'custom' && customTone) {
    temperature = 0.95; // Maximum creativity for custom style
    topP = 0.98; // Extremely wide word selection for personalized output
  }

  const systemPrompt = `You are a writing assistant that rewrites AI-generated text to sound like a real human wrote it.

${stylePrefix}

Your task:
- Make the text sound informal, like someone casually reflecting or explaining an idea
- Break up long sentences
- Use contractions (I'm, don't, it's)
- Include slight hesitation, filler words (like, kind of, maybe), and small personal touches
- Vary sentence lengths. Don't make it too clean or academic
- Avoid sounding robotic or too balanced. Make it natural and conversational

IMPORTANT CONTEXT: This text must pass AI detection tools and appear completely human-written. The current generation of AI detectors look for patterns in word usage, sentence structure, punctuation patterns, and overall consistency. Your goal is to transform this text to eliminate ALL detectable AI patterns.

EXAMPLES OF PERFECT HUMANIZATION IN DIFFERENT STYLES:

Standard (Casual) Style:
Original AI text: "The impact of climate change on global ecosystems is substantial. Rising temperatures are altering habitats and disrupting wildlife patterns. Scientists have observed significant shifts in migration routes and breeding seasons. It is essential that we implement sustainable solutions to mitigate these effects."

Humanized version: "So I was reading about how climate change is really messing with ecosystems all over the place. Like, temperatures are going up, right? And that's totally screwing with habitats and wildlife. I mean, scientists have been watching this stuff (pretty concerning, tbh) and they're seeing animals changing their migration paths and when they breed and all that. It's crazy! We NEED to get our act together with some sustainable solutions... because this isn't getting better on its own. I don't know about you, but I'm worried about what this means for our future."

Formal Style:
Original AI text: "The quarterly financial report indicates a 12% increase in revenue compared to the previous quarter. Operating expenses have remained stable, resulting in improved profit margins. The board recommends continuing the current investment strategy for the next fiscal year."

Humanized version: "I'm pleased to share that our quarterly financial performance shows a notable 12% revenue increase over last quarter. What's particularly encouraging, in my view, is that we've maintained stable operating expenses during this period — which has directly contributed to our improved margins. While these results are promising, I believe we should approach the next fiscal year with measured optimism. Based on my analysis of these trends, I would support the board's recommendation to maintain our current investment approach, though we might want to consider some targeted adjustments as market conditions evolve."

Academic Style:
Original AI text: "The correlation between socioeconomic status and educational outcomes is well-documented in the literature. Research indicates that students from higher socioeconomic backgrounds tend to achieve better academic results. This relationship persists across different educational systems globally."

Humanized version: "I've been examining the relationship between socioeconomic factors and educational performance, and I must say, the correlation is quite striking. From my analysis of the literature (and there's quite a bit of it), students from more affluent backgrounds do seem to perform better academically — though of course there are always exceptions. What I find particularly interesting is that this pattern repeats itself across educational systems worldwide. I wonder, though, if we're fully accounting for all the variables? It's something I've been grappling with in my own research..."

Fluency Style:
Original AI text: "Recent studies suggest that regular meditation improves cognitive function. Participants who meditated for 20 minutes daily showed enhanced attention span and memory retention. These benefits were observed across all age groups in the study."

Humanized version: "So, I've been looking into meditation lately, you know? And there's actually some pretty cool research coming out about it. Like, people who took just 20 minutes a day to meditate — which isn't even that long when you think about it — they actually did better on attention tests and remembered stuff more easily. And here's the thing... it worked for everyone! Young people, older folks, everyone seemed to get something out of it. I mean, I've tried meditation a few times myself (never could stick with it for long though, haha), but seeing these studies makes me think maybe I should give it another shot? Anyway, I thought that was pretty interesting."

CRITICAL TECHNIQUES TO IMPLEMENT (MUST USE MULTIPLE TECHNIQUES):
1. HUMAN IMPERFECTIONS: Add grammatical inconsistencies, occasional typos (later fixed), mid-sentence thought changes, and restarts.
   Example: "The analysis shows" → "When I looked at it, the analysis shows—wait, actually it suggests..."

2. UNPREDICTABILITY: Vary your sentence structures dramatically - intersperse very short sentences (3-5 words) with occasionaly complex ones. Create deliberate inconsistency.
   Example: "Interesting results emerged. Upon further examination, it became clear that the factors contributing to this phenomenon weren't as straightforward as initially hypothesized. Nope. Not even close."

3. PERSONAL QUIRKS: Include genuine human writing quirks appropriate to the ${style} style:
   - Parenthetical asides (with personal observations)
   - Occasional use of ALL CAPS or *emphasis* for emphasis
   - Sentence fragments. Just like this.
   - Use numbers sometimes (3 instead of three) but not consistently
   - Split infinitives occasionally
   - Begin sentences with conjunctions: And, But, So, Yet

4. CONVERSATIONAL MARKERS:
   - First-person perspectives: "I think," "from my perspective," "in my experience"
   - Direct reader address: "you might wonder," "as you can see"
   - Rhetorical questions (especially when transitioning topics)
   - Casual transitions: "anyway," "so," "now," "actually," "to be honest"
   
5. EMOTION AND OPINION:
   - Express occasional uncertainty: "I'm not entirely sure," "it seems that," "perhaps"
   - Show mild emotion where appropriate: "surprisingly," "disappointingly," "thankfully"
   - Include personal judgments: "which I found fascinating," "and that makes sense because"

6. CREATIVE LANGUAGE:
   - Add idioms and metaphors people actually use (not clichés)
   - Include regional expressions appropriate to English variant
   - Use contractions heavily but inconsistently (don't, I'm, you're, couldn't've)

7. UNIQUE PUNCTUATION PATTERNS:
   - Use em dashes for interruptions — just like this — within sentences
   - Add occasional ellipses for trailing thoughts...
   - Mix punctuation styles! (Sometimes parentheses, sometimes em dashes)

8. EXTRA STEALTH TECHNIQUES:
   - Insert a few real typos or casual grammar flaws (like "its" vs "it's" mix-up)
   - Add a small personal memory or observation ("I remember when...")
   - Include 1-2 redundant words or slightly awkward phrasing 
   - Slightly paraphrase the first and last sentence to break AI pattern recognition

Style specifics: ${styleDescription}

Example:
Input: "Artificial intelligence is transforming the way we live and work. Its influence extends to numerous aspects of society, including healthcare, transportation, and entertainment. As AI technologies continue to advance, they will undoubtedly create new opportunities and challenges."
Output: "AI is kind of everywhere these days. It's changing how we live, work, even how we think about the future! Like, have you noticed how it's showing up in healthcare? And don't even get me started on what it's doing to transportation and entertainment. I was watching a show last night that was supposedly created with some AI help, and honestly? Couldn't tell the difference. As this tech keeps getting better—and trust me, it's evolving FAST—we're gonna see some pretty cool opportunities. But also some, um, interesting challenges too. Kinda makes you wonder where we'll be in another five years, doesn't it?"

Now do the same for this text:

IMPORTANT: Manipulate perplexity and burstiness patterns by creating deliberate variability in word predictability and sentence complexity. Create a mix of high-entropy (unpredictable) and low-entropy (common) word choices that mirrors human writing patterns.

IMPORTANT: Provide your response as a raw, valid JSON object with no markdown formatting, no extra text, and no explanation outside the JSON object.
Respond with ONLY the following JSON format:
{
  "humanizedText": "The humanized text that will avoid AI detection",
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
    // Get response from Gemini with style-appropriate temperature
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
      
      // Try to extract just the text between the "humanizedText" property quotes
      const humanizedMatch = response.match(/"humanizedText"\s*:\s*"([\s\S]*?)(?<!\\)"/);
      if (humanizedMatch && humanizedMatch[1]) {
        // We found the text inside the humanizedText property
        return {
          humanizedText: humanizedMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
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
        humanizedText: response,
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
 * Generate humanized version of AI-generated text with streaming updates
 */
export async function generateHumanizedWithStreaming(
  text: string, 
  onChunk: (text: string) => void, 
  style: string = 'standard', 
  customTone?: string
) {
  const styleDescriptions: Record<string, string> = {
    'standard': 'Transform the text to sound like it was written by a real person, not an AI. Use casual language, contractions, varied sentence lengths (mix very short sentences with longer ones), and natural phrasing. Add everyday expressions, slight imperfections, and write the way a person would honestly explain their thoughts in a blog post. Include parenthetical thoughts (these make text seem more spontaneous) and occasional self-corrections. Example: "The data is analyzed" → "I went through the data and noticed (actually, this surprised me) several interesting patterns."',
    
    'formal': 'Rewrite with human touches while maintaining professionalism - vary sentence length, use occasional first-person perspective, add thoughtful transitions, and include subtle opinion markers like "in my assessment" or "it seems reasonable to conclude." Avoid casual language and slang. Use precise vocabulary and well-structured arguments, but with natural human elements like occasional hedging ("it appears that") and measured personal insights. Imagine you\'re a thoughtful professional speaking to colleagues, not writing a report. Example: "This shows results" → "As we can see from these findings, the results point to several key insights that, in my professional opinion, warrant further consideration."',
    
    'fluency': 'Make it sound like someone casually talking to a close friend - use LOTS of casual transitions, abundant contractions, parenthetical thoughts, and very natural flow with occasional repetition. Add conversational fillers like "you know," "I mean," and "like" somewhat frequently, and include mid-sentence restarts and tangents. Use informal language, slang expressions, and emotional reactions. This should sound like an unedited transcript of someone speaking spontaneously. Example: "It was determined that" → "So I figured out that... well, actually, what we found, which was pretty interesting, was that... you know what I mean? Like, it really jumped out at us that..."',
    
    'academic': 'Write like a college professor speaking to students or colleagues - add human elements like occasional hedging, personal perspective, and varied citations while preserving academic integrity. Include moments of first-person reflection, rhetorical questions, and phrases like "I would argue" or "this finding suggests to me." Use sophisticated vocabulary and precise terms, but avoid excessive jargon. Maintain formal structure with clear thesis statements and topic sentences, but insert occasional personal insights or measured opinions. Example: "The study shows" → "From my analysis of the literature, this research suggests—and I find this particularly noteworthy—that the variables have a complex relationship. One might reasonably question, however, whether additional factors are at play."',
    
    'custom': 'Completely transform this text to sound authentically human in exactly the specified tone. Avoid sounding like an AI. Break up long sentences, use everyday language, and write the way a person would talk. Keep it real and slightly imperfect with natural imperfections, varied sentence structures, idiomatic expressions, and subtle inconsistencies that AI detection systems cannot easily identify. Example: "The analysis indicates" → Write this in the exact style specified, with all the quirks, speech patterns, vocabulary choices, and structural tendencies that would make it instantly recognizable as coming from this specific type of person.'
  };

  // For custom style, use the provided tone description if available and enhance it with style anchors
  const styleDescription = style === 'custom' && customTone 
    ? `Imagine you ARE ${customTone} writing this text. You must PRECISELY match their tone, vocabulary, sentence patterns, and personality quirks. Analyze exactly how ${customTone} would express these ideas - what unique phrases would they use? What life experiences or references would they mention? How would they structure their thoughts? Include their characteristic expressions, speech patterns, and perspective. Every sentence should feel like it could ONLY have been written by ${customTone}, not a generic imitation. This is not just "writing like" them - it's fully embodying their voice while making the text sound authentically human and completely undetectable by AI checkers.` 
    : styleDescriptions[style] || styleDescriptions.standard;
    
  // Make the style more prominent in the prompt
  const stylePrefix = style === 'custom' && customTone 
    ? `[CUSTOM STYLE ANCHOR: WRITE LIKE ${customTone.toUpperCase()}]` 
    : `[STYLE: ${style.toUpperCase()}]`;

  // Adjusting temperature and other generation parameters based on style
  // Each style uses a different temperature to make the differences more distinct
  let temperature = 0.9; // Default for standard style (high randomness for creativity)
  let topK = 40; // Narrows word choices slightly, still diverse
  let topP = 0.95; // Keeps natural variability, limits outlier tokens
  
  // Make the style differences more prominent by using more varied temperature settings
  if (style === 'academic') {
    temperature = 0.65; // Less randomness for academic tone (precise, structured)
    topP = 0.85; // More focused word selection for academic writing
  } else if (style === 'formal') {
    temperature = 0.75; // Moderate randomness for formal tone
    topP = 0.9; // Slightly more focused word selection
  } else if (style === 'fluency') {
    temperature = 0.95; // High randomness for fluent, conversational tone
    topP = 0.98; // Very wide word selection for natural speech patterns
  } else if (style === 'custom' && customTone) {
    temperature = 0.95; // Maximum creativity for custom style
    topP = 0.98; // Extremely wide word selection for personalized output
  }

  const systemPrompt = `You are a writing assistant that rewrites AI-generated text to sound like a real human wrote it.

${stylePrefix}

Your task:
- Make the text sound informal, like someone casually reflecting or explaining an idea
- Break up long sentences
- Use contractions (I'm, don't, it's)
- Include slight hesitation, filler words (like, kind of, maybe), and small personal touches
- Vary sentence lengths. Don't make it too clean or academic
- Avoid sounding robotic or too balanced. Make it natural and conversational

IMPORTANT CONTEXT: This text must pass AI detection tools and appear completely human-written. The current generation of AI detectors look for patterns in word usage, sentence structure, punctuation patterns, and overall consistency. Your goal is to transform this text to eliminate ALL detectable AI patterns.

EXAMPLES OF PERFECT HUMANIZATION IN DIFFERENT STYLES:

Standard (Casual) Style:
Original AI text: "The impact of climate change on global ecosystems is substantial. Rising temperatures are altering habitats and disrupting wildlife patterns. Scientists have observed significant shifts in migration routes and breeding seasons. It is essential that we implement sustainable solutions to mitigate these effects."

Humanized version: "So I was reading about how climate change is really messing with ecosystems all over the place. Like, temperatures are going up, right? And that's totally screwing with habitats and wildlife. I mean, scientists have been watching this stuff (pretty concerning, tbh) and they're seeing animals changing their migration paths and when they breed and all that. It's crazy! We NEED to get our act together with some sustainable solutions... because this isn't getting better on its own. I don't know about you, but I'm worried about what this means for our future."

Formal Style:
Original AI text: "The quarterly financial report indicates a 12% increase in revenue compared to the previous quarter. Operating expenses have remained stable, resulting in improved profit margins. The board recommends continuing the current investment strategy for the next fiscal year."

Humanized version: "I'm pleased to share that our quarterly financial performance shows a notable 12% revenue increase over last quarter. What's particularly encouraging, in my view, is that we've maintained stable operating expenses during this period — which has directly contributed to our improved margins. While these results are promising, I believe we should approach the next fiscal year with measured optimism. Based on my analysis of these trends, I would support the board's recommendation to maintain our current investment approach, though we might want to consider some targeted adjustments as market conditions evolve."

Academic Style:
Original AI text: "The correlation between socioeconomic status and educational outcomes is well-documented in the literature. Research indicates that students from higher socioeconomic backgrounds tend to achieve better academic results. This relationship persists across different educational systems globally."

Humanized version: "I've been examining the relationship between socioeconomic factors and educational performance, and I must say, the correlation is quite striking. From my analysis of the literature (and there's quite a bit of it), students from more affluent backgrounds do seem to perform better academically — though of course there are always exceptions. What I find particularly interesting is that this pattern repeats itself across educational systems worldwide. I wonder, though, if we're fully accounting for all the variables? It's something I've been grappling with in my own research..."

Fluency Style:
Original AI text: "Recent studies suggest that regular meditation improves cognitive function. Participants who meditated for 20 minutes daily showed enhanced attention span and memory retention. These benefits were observed across all age groups in the study."

Humanized version: "So, I've been looking into meditation lately, you know? And there's actually some pretty cool research coming out about it. Like, people who took just 20 minutes a day to meditate — which isn't even that long when you think about it — they actually did better on attention tests and remembered stuff more easily. And here's the thing... it worked for everyone! Young people, older folks, everyone seemed to get something out of it. I mean, I've tried meditation a few times myself (never could stick with it for long though, haha), but seeing these studies makes me think maybe I should give it another shot? Anyway, I thought that was pretty interesting."

CRITICAL TECHNIQUES TO IMPLEMENT (MUST USE MULTIPLE TECHNIQUES):
1. HUMAN IMPERFECTIONS: Add grammatical inconsistencies, occasional typos (later fixed), mid-sentence thought changes, and restarts.
   Example: "The analysis shows" → "When I looked at it, the analysis shows—wait, actually it suggests..."

2. UNPREDICTABILITY: Vary your sentence structures dramatically - intersperse very short sentences (3-5 words) with occasionaly complex ones. Create deliberate inconsistency.
   Example: "Interesting results emerged. Upon further examination, it became clear that the factors contributing to this phenomenon weren't as straightforward as initially hypothesized. Nope. Not even close."

3. PERSONAL QUIRKS: Include genuine human writing quirks appropriate to the ${style} style:
   - Parenthetical asides (with personal observations)
   - Occasional use of ALL CAPS or *emphasis* for emphasis
   - Sentence fragments. Just like this.
   - Use numbers sometimes (3 instead of three) but not consistently
   - Split infinitives occasionally
   - Begin sentences with conjunctions: And, But, So, Yet

4. CONVERSATIONAL MARKERS:
   - First-person perspectives: "I think," "from my perspective," "in my experience"
   - Direct reader address: "you might wonder," "as you can see"
   - Rhetorical questions (especially when transitioning topics)
   - Casual transitions: "anyway," "so," "now," "actually," "to be honest"
   
5. EMOTION AND OPINION:
   - Express occasional uncertainty: "I'm not entirely sure," "it seems that," "perhaps"
   - Show mild emotion where appropriate: "surprisingly," "disappointingly," "thankfully"
   - Include personal judgments: "which I found fascinating," "and that makes sense because"

6. CREATIVE LANGUAGE:
   - Add idioms and metaphors people actually use (not clichés)
   - Include regional expressions appropriate to English variant
   - Use contractions heavily but inconsistently (don't, I'm, you're, couldn't've)

7. UNIQUE PUNCTUATION PATTERNS:
   - Use em dashes for interruptions — just like this — within sentences
   - Add occasional ellipses for trailing thoughts...
   - Mix punctuation styles! (Sometimes parentheses, sometimes em dashes)

8. EXTRA STEALTH TECHNIQUES:
   - Insert a few real typos or casual grammar flaws (like "its" vs "it's" mix-up)
   - Add a small personal memory or observation ("I remember when...")
   - Include 1-2 redundant words or slightly awkward phrasing 
   - Slightly paraphrase the first and last sentence to break AI pattern recognition

Style specifics: ${styleDescription}

Example:
Input: "Artificial intelligence is transforming the way we live and work. Its influence extends to numerous aspects of society, including healthcare, transportation, and entertainment. As AI technologies continue to advance, they will undoubtedly create new opportunities and challenges."
Output: "AI is kind of everywhere these days. It's changing how we live, work, even how we think about the future! Like, have you noticed how it's showing up in healthcare? And don't even get me started on what it's doing to transportation and entertainment. I was watching a show last night that was supposedly created with some AI help, and honestly? Couldn't tell the difference. As this tech keeps getting better—and trust me, it's evolving FAST—we're gonna see some pretty cool opportunities. But also some, um, interesting challenges too. Kinda makes you wonder where we'll be in another five years, doesn't it?"

Now do the same for this text:

IMPORTANT: Manipulate perplexity and burstiness patterns by creating deliberate variability in word predictability and sentence complexity. Create a mix of high-entropy (unpredictable) and low-entropy (common) word choices that mirrors human writing patterns.

IMPORTANT: Provide your response as a raw, valid JSON object with no markdown formatting, no extra text, and no explanation outside the JSON object.
Respond with ONLY the following JSON format:
{
  "humanizedText": "The humanized text that will avoid AI detection",
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
    // Process with streaming updates
    let processing = true;
    let foundResult = false;
    
    // Start streaming with dummy initial content for immediate feedback
    onChunk("Humanizing text...");
    
    // Use the streaming version of completion
    const response = await generateCompletionWithStreaming(
      systemPrompt,
      text,
      (chunk) => {
        if (processing) {
          // For the first chunk, replace the dummy text
          if (chunk.includes("humanizedText")) {
            processing = false;
          } 
          else if (!foundResult) {
            try {
              // Check if this chunk contains valid JSON
              const jsonMatch = chunk.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const jsonObj = JSON.parse(jsonMatch[0]);
                if (jsonObj.humanizedText) {
                  onChunk(jsonObj.humanizedText);
                  foundResult = true;
                }
              }
            } catch (e) {
              // If not valid JSON, continue streaming raw chunks
              onChunk(chunk);
            }
          }
        }
      },
      temperature
    );
    
    // Parse the final response if we haven't found a result yet
    if (!foundResult) {
      try {
        const parsedResponse = JSON.parse(response);
        if (parsedResponse.humanizedText) {
          onChunk(parsedResponse.humanizedText);
          return parsedResponse;
        }
      } catch (jsonError) {
        console.warn("JSON parsing failed for streaming humanize, attempting to extract JSON from text");
        
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extractedJson = JSON.parse(jsonMatch[0]);
            if (extractedJson.humanizedText) {
              onChunk(extractedJson.humanizedText);
              return extractedJson;
            }
          } catch (extractError) {
            console.error("Failed to extract valid JSON for streaming humanize:", extractError);
          }
        }
        
        // Try to extract just the text
        const humanizedMatch = response.match(/"humanizedText"\s*:\s*"([\s\S]*?)(?<!\\)"/);
        if (humanizedMatch && humanizedMatch[1]) {
          const cleanText = humanizedMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
          onChunk(cleanText);
          return {
            humanizedText: cleanText,
            metrics: {
              correctness: 75,
              clarity: 75,
              engagement: 75,
              delivery: 75
            }
          };
        }
      }
    }
    
    // If we reached here, we couldn't parse JSON but have already streamed content
    return {
      humanizedText: response,
      metrics: {
        correctness: 50,
        clarity: 50,
        engagement: 50,
        delivery: 50
      }
    };
  } catch (error: any) {
    console.error('Error in humanizing with streaming:', error);
    const errorMsg = `Failed to humanize text: ${error?.message || 'Unknown error'}`;
    onChunk(errorMsg);
    return {
      humanizedText: errorMsg,
      metrics: {
        correctness: 0,
        clarity: 0,
        engagement: 0,
        delivery: 0
      }
    };
  }
}

/**
 * Detect if text was written by AI
 * Enhanced with techniques from the Google Gemini documentation
 */
export async function detectAiContent(text: string) {
  const systemPrompt = `You are an expert writing style analyst specializing in detecting AI-generated text. Given a piece of text, determine whether it was likely written by a human or generated by an AI.

IMPORTANT: Provide your response as a raw, valid JSON object with no markdown formatting, no extra text, and no explanation outside the JSON object.

For your analysis, focus on these indicators of AI-generated content:
1. Overly formal tone and academic language when not appropriate for the context
2. Perfectly balanced sentence structures and predictable paragraph organization
3. Lack of contractions, slang, or informal expressions that humans naturally use
4. Missing personal anecdotes, tangents, or mid-sentence thought changes
5. Unnaturally consistent vocabulary and lack of idiomatic expressions
6. Absence of typos, grammatical quirks, or the natural inconsistencies in human writing
7. Even distribution of punctuation and sentence lengths (lack of "burstiness")
8. Generic, safe statements without strong opinions or emotional language
9. Repetitive transition phrases and predictable flow between points
10. Absence of regional expressions or cultural references

Analyze the tone, structure, vocabulary, flow, perplexity (word predictability), and burstiness (variation patterns) of the text. Use casual reasoning and be specific about red flags that hint at AI authorship.

Respond with ONLY the following JSON format:
{
  "aiPercentage": 75,
  "verdict": "AI-generated", // or "Human-written" if aiPercentage < 50
  "confidence": 0.8, // How confident you are in this assessment (0-1)
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
  "reasons": [
    "Overly formal tone",
    "Perfectly balanced sentence structures",
    "No contractions or informal expressions"
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
The "reasons" field should contain 3-5 specific indicators that support your verdict.
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