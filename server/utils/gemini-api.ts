import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI with API key
const getGenerativeAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Using fallback mechanisms.');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

export async function generateGeminiResponse(prompt: string, maxTokens: number = 1024): Promise<string> {
  try {
    const genAI = getGenerativeAI();
    
    // For text-only input
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Generate content based on the prompt
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      },
    });
    
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating content with Gemini API:', error);
    
    // If API error occurred or API key is missing, return a fallback response
    if (!process.env.GEMINI_API_KEY) {
      return `API key missing. Please set GEMINI_API_KEY environment variable.`;
    }
    
    // Return a meaningful error message that can be handled by the client
    return `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
