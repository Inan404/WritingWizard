import { Request, Response } from "express";
import {
  generateGrammarCheck,
  generateParaphrase,
  generateHumanized,
  generateChatResponse,
  checkAIContent
} from "../services/aiService";
import { checkGrammarWithLanguageTool } from "../services/languageToolService";

/**
 * Unified AI processing endpoint that handles different modes:
 * - grammar: Check and correct grammar issues
 * - paraphrase: Rewrite text while keeping the meaning
 * - humanize: Make text sound more human-written
 * - aicheck: Detect AI-generated content
 * - chat: Conversational responses
 */
export async function processAi(req: Request, res: Response) {
  try {
    const { mode, text, style, messages } = req.body;

    if (!mode) {
      return res.status(400).json({ error: "Mode parameter is required" });
    }

    // Check text length for text-based modes
    if (["grammar", "paraphrase", "humanize", "aicheck"].includes(mode) && text) {
      if (text.length > 10000) {
        return res.status(400).json({ 
          error: "Text too long", 
          message: "The provided text exceeds the maximum length of 10,000 characters"
        });
      }
      
      if (text.length < 3) {
        return res.status(400).json({ 
          error: "Text too short", 
          message: "The provided text must be at least 3 characters long"
        });
      }
    }

    // Different modes require different parameters
    switch (mode) {
      case "grammar":
        if (!text) {
          return res.status(400).json({ error: "Text parameter is required for grammar mode" });
        }
        
        // Check if language parameter is provided for LanguageTool
        const language = req.body.language || 'en-US';
        
        try {
          // Use LanguageTool API for grammar checking
          console.log("Using LanguageTool API for grammar check");
          const grammarResult = await checkGrammarWithLanguageTool(text, language);
          return res.json(grammarResult);
        } catch (languageToolError) {
          console.error("LanguageTool grammar check error:", languageToolError);
          
          // Fallback to Perplexity AI if LanguageTool fails
          try {
            console.log("Falling back to Perplexity API for grammar check");
            const grammarResult = await generateGrammarCheck(text);
            return res.json(grammarResult);
          } catch (grammarError) {
            console.error("Grammar check error:", grammarError);
            return res.status(500).json({ 
              error: "Grammar check failed", 
              message: grammarError instanceof Error ? grammarError.message : "Unknown error during grammar check"
            });
          }
        }

      case "paraphrase":
        if (!text) {
          return res.status(400).json({ error: "Text parameter is required for paraphrase mode" });
        }
        
        // Validate style parameter
        const validParaphraseStyles = ["standard", "formal", "fluency", "academic", "custom"];
        const paraphraseStyle = style && validParaphraseStyles.includes(style) ? style : "standard";
        
        try {
          const paraphraseResult = await generateParaphrase(text, paraphraseStyle);
          return res.json(paraphraseResult);
        } catch (paraphraseError) {
          console.error("Paraphrase error:", paraphraseError);
          return res.status(500).json({ 
            error: "Paraphrase failed", 
            message: paraphraseError instanceof Error ? paraphraseError.message : "Unknown error during paraphrasing"
          });
        }

      case "humanize":
        if (!text) {
          return res.status(400).json({ error: "Text parameter is required for humanize mode" });
        }
        
        // Validate style parameter
        const validHumanizeStyles = ["standard", "formal", "fluency", "academic", "custom"];
        const humanizeStyle = style && validHumanizeStyles.includes(style) ? style : "standard";
        
        try {
          const humanizeResult = await generateHumanized(text, humanizeStyle);
          return res.json(humanizeResult);
        } catch (humanizeError) {
          console.error("Humanize error:", humanizeError);
          return res.status(500).json({ 
            error: "Humanize failed", 
            message: humanizeError instanceof Error ? humanizeError.message : "Unknown error during humanizing"
          });
        }

      case "aicheck":
        if (!text) {
          return res.status(400).json({ error: "Text parameter is required for aicheck mode" });
        }
        
        try {
          const aiCheckResult = await checkAIContent(text);
          return res.json(aiCheckResult);
        } catch (aicheckError) {
          console.error("AI check error:", aicheckError);
          return res.status(500).json({ 
            error: "AI content check failed", 
            message: aicheckError instanceof Error ? aicheckError.message : "Unknown error during AI content check"
          });
        }

      case "chat":
        if (!messages || !Array.isArray(messages)) {
          return res.status(400).json({ error: "Messages array is required for chat mode" });
        }
        
        if (messages.length === 0) {
          return res.status(400).json({ error: "Messages array cannot be empty" });
        }
        
        if (messages.length > 50) {
          return res.status(400).json({ 
            error: "Too many messages", 
            message: "The chat history exceeds the maximum of 50 messages"
          });
        }
        
        // Validate message format
        for (const msg of messages) {
          if (!msg.role || !msg.content || typeof msg.content !== 'string') {
            return res.status(400).json({ 
              error: "Invalid message format",
              message: "Each message must have a 'role' and 'content' property"
            });
          }
          
          if (!['system', 'user', 'assistant'].includes(msg.role)) {
            return res.status(400).json({
              error: "Invalid message role",
              message: "Message role must be one of: 'system', 'user', 'assistant'"
            });
          }
          
          if (msg.content.length > 4000) {
            return res.status(400).json({
              error: "Message too long",
              message: "Message content exceeds the maximum length of 4,000 characters"
            });
          }
        }
        
        // Format the messages for the AI
        const formattedMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        try {
          const chatResponse = await generateChatResponse(formattedMessages);
          return res.json({ response: chatResponse });
        } catch (chatError) {
          console.error("Chat response error:", chatError);
          return res.status(500).json({ 
            error: "Chat response failed", 
            message: chatError instanceof Error ? chatError.message : "Unknown error during chat response generation"
          });
        }

      default:
        return res.status(400).json({ 
          error: "Unsupported mode", 
          message: `Unsupported mode: ${mode}. Supported modes are: grammar, paraphrase, humanize, aicheck, chat`
        });
    }
    
  } catch (error) {
    console.error("AI processing error:", error);
    return res.status(500).json({
      error: "Error processing AI request",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}