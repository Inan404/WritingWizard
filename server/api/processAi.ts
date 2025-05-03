import { Request, Response } from 'express';
import { 
  generateGrammarCheck, 
  generateParaphrase, 
  generateHumanized, 
  generateChatResponse
} from '../services/aiService';

/**
 * Unified AI processing endpoint that handles different modes:
 * - grammar: Check and correct grammar issues
 * - paraphrase: Rewrite text while keeping the meaning
 * - humanize: Make text sound more human-written
 * - chat: Conversational responses
 */
export async function processAi(req: Request, res: Response) {
  try {
    const { text, mode, style, messages } = req.body;
    
    // Validate input
    if (!mode) {
      return res.status(400).json({ 
        error: "Mode is required (grammar, paraphrase, humanize, or chat)" 
      });
    }
    
    // Process based on mode
    switch (mode) {
      case 'grammar':
        if (!text || typeof text !== 'string') {
          return res.status(400).json({ error: "Valid text input is required" });
        }
        
        const grammarResult = await generateGrammarCheck(text);
        return res.json({ 
          result: {
            correctedText: grammarResult.corrected,
            highlights: grammarResult.highlights,
            suggestions: grammarResult.suggestions
          }
        });
        
      case 'paraphrase':
        if (!text || typeof text !== 'string') {
          return res.status(400).json({ error: "Valid text input is required" });
        }
        
        const paraphraseResult = await generateParaphrase(text, style || 'standard');
        return res.json({ 
          result: {
            paraphrasedText: paraphraseResult.paraphrased,
            metrics: paraphraseResult.metrics
          }
        });
        
      case 'humanize':
        if (!text || typeof text !== 'string') {
          return res.status(400).json({ error: "Valid text input is required" });
        }
        
        const humanizeResult = await generateHumanized(text, style || 'standard');
        return res.json({ 
          result: {
            humanizedText: humanizeResult.humanized,
            metrics: humanizeResult.metrics
          }
        });
        
      case 'chat':
        if (messages && Array.isArray(messages)) {
          const chatResponse = await generateChatResponse(messages);
          return res.json({ 
            result: chatResponse
          });
        } else if (text && typeof text === 'string') {
          // If just a single text message provided, treat as a user message
          const chatResponse = await generateChatResponse([
            { role: 'user', content: text }
          ]);
          return res.json({ 
            result: chatResponse 
          });
        } else {
          return res.status(400).json({ 
            error: "Either valid messages array or text input is required" 
          });
        }
        
      default:
        return res.status(400).json({ 
          error: "Invalid mode. Must be 'grammar', 'paraphrase', 'humanize', or 'chat'" 
        });
    }
  } catch (error) {
    console.error("Error processing AI request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ 
      error: `Failed to process request: ${errorMessage}` 
    });
  }
}