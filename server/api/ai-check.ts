import { Request, Response } from 'express';
import { checkAIContent } from '../services/aiService';

export async function aiCheckHandler(req: Request, res: Response) {
  try {
    // Get the text from the request body
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing text parameter' });
    }
    
    console.log('Processing AI check request for text:', text.substring(0, 50) + '...');
    
    // Process the text through our AI check service
    const result = await checkAIContent(text);
    
    console.log('AI check result:', {
      aiPercentage: result.aiPercentage,
      highlightsCount: result.highlights.length,
      suggestionsCount: result.suggestions.length
    });
    
    // Return the results
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in AI check endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to check for AI content',
      message: error.message 
    });
  }
}