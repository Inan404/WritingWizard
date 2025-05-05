/**
 * Gemini API Service
 * Uses Google's Generative AI library for Gemini model integration
 */

import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';

// Get the Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Check if API key is available
export const hasGeminiCredentials = !!GEMINI_API_KEY;

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY as string);

// Default model to use
const DEFAULT_MODEL = 'gemini-1.5-pro';

// Cache for model instances
const modelCache: Record<string, GenerativeModel> = {};

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
 * Convert messages to the Gemini chat format
 */
function prepareMessages(messages: Message[]) {
  // Create a chat history
  const history: { role: 'user' | 'model', parts: [{text: string}] }[] = [];
  let systemMessage = '';
  
  // Extract system message and format chat history
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    if (message.role === 'system') {
      systemMessage = message.content;
    } else if (message.role === 'user') {
      // If there's a system message and this is the first user message, combine them
      if (systemMessage && history.length === 0) {
        history.push({
          role: 'user',
          parts: [{ text: `${systemMessage}\n\n${message.content}` }]
        });
        systemMessage = ''; // Clear system message after using it
      } else {
        history.push({
          role: 'user',
          parts: [{ text: message.content }]
        });
      }
    } else if (message.role === 'assistant') {
      history.push({
        role: 'model',
        parts: [{ text: message.content }]
      });
    }
  }
  
  return history;
}

/**
 * Generate a chat response based on conversation history
 */
export async function generateChatResponse(messages: Message[]): Promise<string> {
  try {
    console.log('Generating chat response with Gemini');
    
    // Format messages for Gemini
    const history = prepareMessages(messages);
    
    // Get the model with a moderate temperature
    const model = getModel(DEFAULT_MODEL, {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
    });
    
    // Create a chat instance and send message
    const chat = model.startChat({
      history: history.slice(0, -1), // All messages except the last one
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
    
    // Get the last message (user's query)
    const lastMessage = history[history.length - 1];
    
    // Generate the response
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = result.response.text();
    
    return response;
  } catch (error: any) {
    console.error('Error in Gemini chat response:', error);
    throw new Error(`Failed to generate chat response: ${error?.message || 'Unknown error'}`);
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
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    return response;
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
 * Generate humanized version of AI-generated text
 */
export async function generateHumanized(text: string, style: string = 'standard', customTone?: string) {
  const styleDescriptions: Record<string, string> = {
    'standard': 'Make the text sound more human by adding natural variations and flow. Example: "The data is analyzed" → "I\'ve gone through the data"',
    'formal': 'Humanize while maintaining formal tone suitable for professional contexts. Example: "This shows results" → "The analysis reveals these findings"',
    'fluency': 'Optimize for conversational flow and natural rhythm. Example: "It was determined that" → "We figured out that" or "I discovered that"',
    'academic': 'Humanize while preserving academic integrity and appropriate terminology. Example: "The study shows" → "Our research indicates" or "The evidence suggests"',
    'custom': 'Be creative with humanizing the text while making it sound authentic. Follow the specified tone exactly.'
  };

  // For custom style, use the provided tone description if available
  const styleDescription = style === 'custom' && customTone 
    ? `Use a ${customTone} tone while humanizing the text to sound authentic.` 
    : styleDescriptions[style] || styleDescriptions.standard;
    
  // Make the style more prominent in the prompt
  const stylePrefix = style === 'custom' && customTone 
    ? `[CUSTOM TONE: ${customTone.toUpperCase()}]` 
    : `[STYLE: ${style.toUpperCase()}]`;

  const systemPrompt = `You are an expert writing assistant specializing in making AI-generated text sound more human.
${stylePrefix}
Rewrite the provided text to sound more natural and human-written.
VERY IMPORTANT: Use the ${style === 'custom' ? customTone : style} style for humanizing.
Style description: ${styleDescription}
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