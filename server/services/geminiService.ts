/**
 * Gemini API Service
 * Uses Google's Gemini API for AI capabilities
 */

// Get the Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Default model to use
const DEFAULT_MODEL = 'gemini-1.5-pro';

// Function message interface
interface Message {
  role: 'user' | 'model' | 'system';
  parts: {
    text: string;
  }[];
}

// Options for API requests
interface GeminiRequestOptions {
  model?: string;
  messages: Message[];
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  candidateCount?: number;
  safetySettings?: any[];
}

// Response from Gemini API
interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
      role: string;
    };
    finishReason: string;
  }[];
}

/**
 * Call the Gemini API with the provided messages
 */
async function callGeminiAPI(options: GeminiRequestOptions): Promise<GeminiResponse> {
  // Default options
  const defaultOptions = {
    model: DEFAULT_MODEL,
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    candidateCount: 1,
  };

  // Merge with provided options
  const requestOptions = {
    ...defaultOptions,
    ...options
  };

  // Log the call
  console.log(`Calling Gemini API with model: ${requestOptions.model}`);

  try {
    // Make the API request
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${requestOptions.model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: requestOptions.messages,
        generationConfig: {
          temperature: requestOptions.temperature,
          topP: requestOptions.topP,
          topK: requestOptions.topK,
          maxOutputTokens: requestOptions.maxOutputTokens,
          candidateCount: requestOptions.candidateCount,
        },
        safetySettings: requestOptions.safetySettings || [],
      }),
    });

    // Check for errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Parse the response
    const data = await response.json();
    return data as GeminiResponse;
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    throw new Error(`Failed to call Gemini API: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Convert system + user message format to Gemini format
 */
function convertToGeminiFormat(systemPrompt: string, userPrompt: string): Message[] {
  return [
    {
      role: 'user',
      parts: [
        {
          text: `${systemPrompt}\n\n${userPrompt}`
        }
      ]
    }
  ];
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

    const messages = convertToGeminiFormat(systemPrompt, text);
    const response = await callGeminiAPI({
      messages,
      temperature: 0.2, // Lower temperature for more accurate, consistent corrections
    });

    // Get raw content from the API response
    const content = response.candidates[0]?.content.parts[0]?.text;
    
    if (!content) {
      throw new Error("Empty response from Gemini API");
    }
    
    try {
      // Try to parse as JSON directly first
      const parsedResponse = JSON.parse(content);
      
      // Merge local errors with API errors
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
      console.warn("JSON parsing failed, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
          console.error("Failed to extract valid JSON:", extractError);
        }
      }
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
    
    const messages = convertToGeminiFormat(systemPrompt, text);
    const response = await callGeminiAPI({
      messages,
      temperature, // Adjusted temperature based on style
    });

    // Get raw content from the API response
    const content = response.candidates[0]?.content.parts[0]?.text;
    
    if (!content) {
      throw new Error("Empty response from Gemini API");
    }
    
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
      
      // Try to extract just the text between the "paraphrased" property quotes
      const paraphrasedMatch = content.match(/"paraphrased"\s*:\s*"([\s\S]*?)(?<!\\)"/);
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
      
      // If we couldn't extract the paraphrased text, use the raw content but limit to just text
      // Strip any JSON-looking formatting to get just plain text
      const cleanedText = content.replace(/^\s*\{[\s\S]*"paraphrased"\s*:\s*"|"\s*,\s*"metrics[\s\S]*$/g, '');
      return {
        paraphrased: cleanedText,
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
    
    const messages = convertToGeminiFormat(systemPrompt, text);
    const response = await callGeminiAPI({
      messages,
      temperature, // Adjusted temperature based on style
    });

    // Get raw content from the API response
    const content = response.candidates[0]?.content.parts[0]?.text;
    
    if (!content) {
      throw new Error("Empty response from Gemini API");
    }
    
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
      
      // Try to extract just the text between the "humanized" property quotes
      const humanizedMatch = content.match(/"humanized"\s*:\s*"([\s\S]*?)(?<!\\)"/);
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
      
      // If we couldn't extract the humanized text, use the raw content but limit to just text
      // Strip any JSON-looking formatting to get just plain text
      const cleanedText = content.replace(/^\s*\{[\s\S]*"humanized"\s*:\s*"|"\s*,\s*"metrics[\s\S]*$/g, '');
      return {
        humanized: cleanedText,
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
 * Analyze text to determine if it was written by AI
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
    const messages = convertToGeminiFormat(systemPrompt, text);
    const response = await callGeminiAPI({
      messages,
      temperature: 0.1, // Low temperature for more consistent detection
    });

    // Get raw content from the API response
    const content = response.candidates[0]?.content.parts[0]?.text;
    
    if (!content) {
      throw new Error("Empty response from Gemini API");
    }
    
    try {
      // Try to parse as JSON directly first
      const parsedResponse = JSON.parse(content);
      return parsedResponse;
    } catch (jsonError) {
      console.warn("JSON parsing failed for AI detection, attempting to extract JSON from text");
      
      // Try to find the JSON object in the text (between curly braces)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson;
        } catch (extractError) {
          console.error("Failed to extract valid JSON for AI detection:", extractError);
        }
      }
      
      // Extract the AI percentage using regex
      const percentMatch = content.match(/(\d+)%|"aiPercentage"\s*:\s*(\d+)/);
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
    const messages = convertToGeminiFormat(systemPrompt, prompt);
    const response = await callGeminiAPI({
      messages,
      temperature: 0.7,
    });

    // Get raw content from the API response
    const generatedText = response.candidates[0]?.content.parts[0]?.text;
    
    if (!generatedText) {
      throw new Error("Empty response from Gemini API");
    }
    
    return { generatedText };
  } catch (error: any) {
    console.error('Error in content generation:', error);
    throw new Error(`Failed to generate content: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a chat response based on conversation history
 */
export async function generateChatResponse(messages: any[]): Promise<string> {
  try {
    // Convert from Perplexity-style messages to Gemini format
    const geminiMessages: Message[] = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));
    
    // Ensure the roles alternate correctly for Gemini
    // This conversion is more complex because Gemini doesn't support system messages directly
    const processedMessages = geminiMessages.reduce((acc: Message[], msg, index) => {
      // If it's a system message and there's a user message next, merge them
      if (msg.role === 'system' && index < geminiMessages.length - 1 && geminiMessages[index + 1].role === 'user') {
        const systemInstruction = msg.parts[0].text;
        const userMessage = geminiMessages[index + 1].parts[0].text;
        
        acc.push({
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\n${userMessage}` }]
        });
        
        // Skip the next message since we merged it
        geminiMessages[index + 1] = { role: 'processed', parts: [] } as any;
      } 
      // Add any non-system messages that haven't been processed yet
      else if (msg.role !== 'system' && msg.role !== 'processed') {
        acc.push(msg);
      }
      
      return acc;
    }, []);
    
    console.log('Sending messages to Gemini:', JSON.stringify(processedMessages));
    
    const response = await callGeminiAPI({
      messages: processedMessages,
      temperature: 0.7,
    });

    // Get raw content from the API response
    const content = response.candidates[0]?.content.parts[0]?.text;
    
    if (!content) {
      throw new Error("Empty response from Gemini API");
    }
    
    return content;
  } catch (error: any) {
    console.error('Error in chat response:', error);
    throw new Error(`Failed to generate chat response: ${error?.message || 'Unknown error'}`);
  }
}

// Export function that checks if we have credentials
export const hasGeminiCredentials = !!GEMINI_API_KEY;