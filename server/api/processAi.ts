import { Request, Response } from "express";
import {
  generateGrammarCheck,
  generateParaphrase,
  generateHumanized,
  generateChatResponse,
  generateChatResponseWithStreaming,
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
    const { mode, text, style, customTone, messages } = req.body;

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
          
          // Fallback to Gemini AI if LanguageTool fails
          try {
            console.log("Falling back to Gemini API for grammar check");
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
          // Pass custom tone to paraphrase function if style is custom
          const paraphraseResult = paraphraseStyle === 'custom' && customTone
            ? await generateParaphrase(text, paraphraseStyle, customTone)
            : await generateParaphrase(text, paraphraseStyle);
          
          // Ensure we're returning data in a consistent format
          // Make sure paraphrased text is available in both formats for backward compatibility
          const response = {
            paraphrased: paraphraseResult.paraphrased,
            paraphrasedText: paraphraseResult.paraphrased, // For backward compatibility
            metrics: paraphraseResult.metrics
          };
          
          return res.json(response);
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
          // Pass custom tone to humanize function if style is custom
          const humanizeResult = humanizeStyle === 'custom' && customTone
            ? await generateHumanized(text, humanizeStyle, customTone)
            : await generateHumanized(text, humanizeStyle);
          
          // Ensure we're returning data in a consistent format
          // Make sure humanized text is available in both formats for backward compatibility
          const response = {
            humanized: humanizeResult.humanized,
            humanizedText: humanizeResult.humanized, // For backward compatibility
            metrics: humanizeResult.metrics
          };
          
          return res.json(response);
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
          // Extract chatId if it exists to save the AI response to the database
          const chatId = req.body.chatId;
          
          // Set headers for streaming response
          res.setHeader('Content-Type', 'application/json');
          
          // Generate the chat response with streaming
          const fullResponse = await generateChatResponseWithStreaming(formattedMessages, (chunkText) => {
            // For each chunk, send a JSON response with the accumulated text so far
            res.write(JSON.stringify({ response: chunkText }) + '\n');
          });
          
          // If a chatId is provided, save the AI response to the database when complete
          if (chatId && typeof chatId === 'number' && req.user?.id) {
            try {
              const dbStorage = (await import('../dbStorage')).dbStorage;
              
              // Save the AI's response to the database
              await dbStorage.createChatMessage({
                sessionId: chatId,
                role: 'assistant',
                content: fullResponse
              });
              
              console.log(`Saved AI response to chat session ${chatId}`);
            } catch (dbError) {
              console.error('Failed to save AI response to database:', dbError);
              // Continue even if database save fails - don't block the response
            }
          }
          
          // Send the final response and end the stream
          res.end();
          return;
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