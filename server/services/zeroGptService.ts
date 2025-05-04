/**
 * ZeroGPT API Service
 * Handles detection of AI-generated content
 */

import fetch from 'node-fetch';

// Get the API key from environment variables
const ZEROGPT_API_KEY = process.env.ZEROGPT_API_KEY;

// Check if we have credentials
export const hasZeroGptCredentials = !!ZEROGPT_API_KEY;

interface ZeroGptResponse {
  ai_percent: number;
  ai_score: number;
  gpt_perplexity_score: number;
  input_tokens: number;
  process_time: number;
  tokens: number;
  total_tokens: number;
}

interface AiHighlight {
  id: string;
  position: {
    start: number;
    end: number;
  };
}

interface AiCheckResult {
  aiPercentage: number;
  highlights: AiHighlight[];
  suggestions: any[];
  metrics: {
    correctness: number;
    clarity: number;
    engagement: number;
    delivery: number;
  };
}

/**
 * Analyze text for AI-generated content detection using ZeroGPT API
 */
export async function detectAiContent(text: string): Promise<AiCheckResult> {
  if (!hasZeroGptCredentials) {
    throw new Error('ZeroGPT API key is not configured');
  }

  try {
    // Call the ZeroGPT API
    const response = await fetch('https://api.zerogpt.com/api/v1/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZEROGPT_API_KEY}`
      },
      body: JSON.stringify({ input_text: text })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`ZeroGPT API error: ${response.status} ${errorData}`);
    }

    const data = await response.json() as ZeroGptResponse;
    console.log('ZeroGPT API response:', data);

    // Generate highlights based on AI percentage
    // For now, we'll create simple highlights
    // In a production app, you might get more detailed highlights from the API
    const highlights: AiHighlight[] = [];
    
    // Only add highlights if AI percentage is above a threshold
    if (data.ai_percent > 30) {
      // Create some simple highlights based on text length and AI percentage
      // This is a simplified approach since ZeroGPT API doesn't provide specific highlights
      const textLength = text.length;
      const numHighlights = Math.min(5, Math.max(1, Math.floor(textLength / 200)));
      
      for (let i = 0; i < numHighlights; i++) {
        const segmentLength = Math.floor(textLength / numHighlights);
        const start = i * segmentLength;
        // Make sure the highlight isn't too large
        const end = Math.min(start + Math.min(segmentLength, 100), textLength);
        
        highlights.push({
          id: `highlight-${i}`,
          position: {
            start,
            end
          }
        });
      }
    }

    // Format the result
    return {
      aiPercentage: data.ai_percent,
      highlights,
      suggestions: [], // No suggestions for now
      metrics: {
        correctness: Math.max(50, 100 - data.ai_percent),
        clarity: 70, // Default values
        engagement: 70,
        delivery: 70
      }
    };
  } catch (error: any) {
    console.error('Error detecting AI content:', error);
    throw new Error(`Failed to detect AI content: ${error?.message || 'Unknown error'}`);
  }
}