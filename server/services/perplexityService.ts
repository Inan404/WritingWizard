/**
 * Perplexity API Service
 * Uses the Perplexity API with the llama-3.1-sonar-small-128k-online model
 */
import { sanitizeMessages, SanitizedMessage } from '../utils/sanitizeMessages';

// Get the Perplexity API key from environment variables
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// Default AI model to use
const DEFAULT_MODEL = 'llama-3.1-sonar-small-128k-online';

// Define message interface for chat requests
interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Options for API requests
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

// Response choice from API
interface PerplexityResponseChoice {
  index: number;
  finish_reason: string;
  message: {
    role: string;
    content: string;
  };
}

// Complete response interface
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

/**
 * Call the Perplexity API with the provided messages
 */
async function callPerplexityAPI(options: PerplexityRequestOptions): Promise<PerplexityResponse> {
  // Default options
  const defaultOptions = {
    model: DEFAULT_MODEL,
    stream: false,
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0
  };

  // Merge with provided options
  const requestOptions = {
    ...defaultOptions,
    ...options
  };

  // Log the call
  console.log(`Calling Perplexity API with model: ${requestOptions.model}`);

  try {
    // Make the API request
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(requestOptions)
    });

    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Parse the response
    const data = await response.json();
    return data as PerplexityResponse;
  } catch (error: any) {
    console.error('Perplexity API call failed:', error);
    throw new Error(`Failed to call Perplexity API: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a response for grammar checking
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
- Spelling errors should reduce correctness by 10-15 points each

Be precise with error positions in the text.
Include corrected full text in the response to reflect all applied fixes.`;

  try {
    // Find common grammar errors before API call
    const lowercaseIPattern = /(\s|^)i(\s|$|\.|,|;|:|\?|!)/g;
    const subjectVerbAgreementPattern = /(\s|^)I\s+is(\s|$|\.|,|;|:|\?|!)/g;
    
    let modifiedText = text;
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

    const response = await callPerplexityAPI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.2, // Lower temperature for more accurate, consistent corrections
    });

    // Get raw content from the API response
    const content = response.choices[0].message.content;
    
    let parsedResponse = null;
    
    try {
      // Try to parse as JSON directly first
      parsedResponse = JSON.parse(content);
    } catch (jsonError) {
      console.warn("JSON parsing failed, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          console.error("Failed to extract valid JSON:", extractError);
        }
      }
    }
    
    // If we have a valid response, merge with local errors
    if (parsedResponse && 
        parsedResponse.errors && 
        parsedResponse.suggestions && 
        parsedResponse.metrics) {
      
      // Merge local errors with API errors
      const allErrors = [...localErrors, ...parsedResponse.errors];
      
      // Update metrics - if we found errors locally but API didn't, adjust scores
      if (localErrors.length > 0 && parsedResponse.errors.length === 0) {
        parsedResponse.metrics.correctness = Math.max(0, Math.min(100, parsedResponse.metrics.correctness - 20));
      }
      
      return {
        ...parsedResponse,
        errors: allErrors
      };
    }
    
    // Generate metrics based on error count - more errors means lower scores
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
  } catch (error: any) {
    console.error('Error in grammar check:', error);
    throw new Error(`Failed to check grammar: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a paraphrased version of the text
 */
export async function generateParaphrase(text: string, style: string = 'standard', customTone?: string) {
  const styleDescriptions: Record<string, string> = {
    'standard': 'Maintain the original tone while rewording for clarity.',
    'formal': 'Use more formal language with academic vocabulary and structure.',
    'fluency': 'Optimize for smooth, natural-sounding flow.',
    'academic': 'Use academic terminology and structures appropriate for scholarly work.',
    'custom': 'Be more creative with rephrasing while preserving meaning.'
  };

  // For custom style, use the provided tone description if available
  const styleDescription = style === 'custom' && customTone 
    ? `Use a ${customTone} tone while preserving the meaning.` 
    : styleDescriptions[style] || styleDescriptions.standard;

  const systemPrompt = `You are an expert writing assistant specializing in paraphrasing.
Rewrite the provided text in a different way while preserving its original meaning.
Style: ${styleDescription}
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
    const response = await callPerplexityAPI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7, // Higher temperature for more creative paraphrasing
    });

    // Get raw content from the API response
    const content = response.choices[0].message.content;
    
    try {
      // Try to parse as JSON directly first
      const parsedResponse = JSON.parse(content);
      return parsedResponse;
    } catch (jsonError) {
      console.warn("JSON parsing failed for paraphrase, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson;
        } catch (extractError) {
          console.error("Failed to extract valid JSON for paraphrase:", extractError);
        }
      }
      
      // If JSON parsing fails, use the raw content as the paraphrased text
      console.warn("Falling back to text processing for paraphrase");
      return {
        paraphrased: content,
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
 * Generate a humanized version of AI-generated text
 */
export async function generateHumanized(text: string, style: string = 'standard', customTone?: string) {
  const styleDescriptions: Record<string, string> = {
    'standard': 'Make the text sound more human by adding natural variations and flow.',
    'formal': 'Humanize while maintaining formal tone suitable for professional contexts.',
    'fluency': 'Optimize for conversational flow and natural rhythm.',
    'academic': 'Humanize while preserving academic integrity and appropriate terminology.',
    'custom': 'Be creative with humanizing the text while making it sound authentic.'
  };

  // For custom style, use the provided tone description if available
  const styleDescription = style === 'custom' && customTone 
    ? `Use a ${customTone} tone while humanizing the text to sound authentic.` 
    : styleDescriptions[style] || styleDescriptions.standard;

  const systemPrompt = `You are an expert writing assistant specializing in making AI-generated text sound more human.
Rewrite the provided text to sound more natural and human-written.
Style: ${styleDescription}
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
    const response = await callPerplexityAPI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7, // Higher temperature for more human-like variations
    });

    // Get raw content from the API response
    const content = response.choices[0].message.content;
    
    try {
      // Try to parse as JSON directly first
      const parsedResponse = JSON.parse(content);
      return parsedResponse;
    } catch (jsonError) {
      console.warn("JSON parsing failed for humanize, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson;
        } catch (extractError) {
          console.error("Failed to extract valid JSON for humanize:", extractError);
        }
      }
      
      // If JSON parsing fails, use the raw content as the humanized text
      console.warn("Falling back to text processing for humanize");
      return {
        humanized: content,
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
 * Generate a chat response based on conversation history
 */
export async function generateChatResponse(messages: PerplexityMessage[]): Promise<string> {
  try {
    // Use the sanitizeMessages function to guarantee proper message formatting
    const sanitizedMessages = sanitizeMessages(messages as SanitizedMessage[]);
    
    console.log('Sending sanitized messages to Perplexity:', JSON.stringify(sanitizedMessages));
    const response = await callPerplexityAPI({
      messages: sanitizedMessages,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('Error in chat response:', error);
    throw new Error(`Failed to generate chat response: ${error?.message || 'Unknown error'}`);
  }
}

// Export function that checks if we have credentials
export const hasPerplexityCredentials = !!PERPLEXITY_API_KEY;