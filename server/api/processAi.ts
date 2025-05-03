import { Request, Response } from "express";
import {
  generateGrammarCheck,
  generateParaphrase,
  generateHumanized,
  generateChatResponse,
  checkAIContent
} from "../services/aiService";

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

    // Different modes require different parameters
    switch (mode) {
      case "grammar":
        if (!text) {
          return res.status(400).json({ error: "Text parameter is required for grammar mode" });
        }
        const grammarResult = await generateGrammarCheck(text);
        return res.json(grammarResult);

      case "paraphrase":
        if (!text) {
          return res.status(400).json({ error: "Text parameter is required for paraphrase mode" });
        }
        const paraphraseResult = await generateParaphrase(text, style || "standard");
        return res.json(paraphraseResult);

      case "humanize":
        if (!text) {
          return res.status(400).json({ error: "Text parameter is required for humanize mode" });
        }
        const humanizeResult = await generateHumanized(text, style || "standard");
        return res.json(humanizeResult);

      case "aicheck":
        if (!text) {
          return res.status(400).json({ error: "Text parameter is required for aicheck mode" });
        }
        const aiCheckResult = await checkAIContent(text);
        return res.json(aiCheckResult);

      case "chat":
        if (!messages || !Array.isArray(messages)) {
          return res.status(400).json({ error: "Messages array is required for chat mode" });
        }
        
        // Format the messages for the AI
        const formattedMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        const chatResponse = await generateChatResponse(formattedMessages);
        return res.json({ response: chatResponse });

      default:
        return res.status(400).json({ error: `Unsupported mode: ${mode}` });
    }
    
  } catch (error) {
    console.error("AI processing error:", error);
    return res.status(500).json({
      error: "Error processing AI request",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}