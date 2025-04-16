import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateGrammarCheck, generateParaphrase, generateHumanized, checkAIContent, generateWriting } from "./services/aiService";
import { saveWritingChat } from "./services/writingService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Grammar check endpoint
  app.post("/api/grammar-check", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
      }
      
      const result = await generateGrammarCheck(text);
      res.json(result);
    } catch (error) {
      console.error("Grammar check error:", error);
      res.status(500).json({ message: "Error checking grammar" });
    }
  });

  // Paraphrase endpoint
  app.post("/api/paraphrase", async (req, res) => {
    try {
      const { text, style } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
      }
      
      const result = await generateParaphrase(text, style);
      res.json(result);
    } catch (error) {
      console.error("Paraphrase error:", error);
      res.status(500).json({ message: "Error paraphrasing text" });
    }
  });

  // Humanize endpoint
  app.post("/api/humanize", async (req, res) => {
    try {
      const { text, style } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
      }
      
      const result = await generateHumanized(text, style);
      res.json(result);
    } catch (error) {
      console.error("Humanize error:", error);
      res.status(500).json({ message: "Error humanizing text" });
    }
  });

  // AI check endpoint
  app.post("/api/ai-check", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
      }
      
      const result = await checkAIContent(text);
      res.json(result);
    } catch (error) {
      console.error("AI check error:", error);
      res.status(500).json({ message: "Error checking AI content" });
    }
  });

  // Generate writing endpoint
  app.post("/api/generate-writing", async (req, res) => {
    try {
      const { sample, references, instructions, length, style, format } = req.body;
      
      if (!instructions || typeof instructions !== "string") {
        return res.status(400).json({ message: "Instructions are required" });
      }
      
      const result = await generateWriting(sample, references, instructions, length, style, format);
      res.json(result);
    } catch (error) {
      console.error("Generate writing error:", error);
      res.status(500).json({ message: "Error generating writing" });
    }
  });

  // Save writing chat endpoint
  app.post("/api/save-writing-chat", async (req, res) => {
    try {
      const { rawText, grammarResult, paraphraseResult, aiCheckResult, humanizeResult } = req.body;
      
      if (!rawText || typeof rawText !== "string") {
        return res.status(400).json({ message: "Raw text is required" });
      }
      
      const result = await saveWritingChat(
        rawText, 
        grammarResult, 
        paraphraseResult, 
        aiCheckResult, 
        humanizeResult
      );
      
      res.json(result);
    } catch (error) {
      console.error("Save writing chat error:", error);
      res.status(500).json({ message: "Error saving writing chat" });
    }
  });

  // Get writing chats endpoint
  app.get("/api/writing-chats", async (req, res) => {
    try {
      // Since we don't have authentication in this MVP, we'll return all chats
      // In a real app, we'd filter by authenticated user ID
      const userId = 1; // Default user for now
      const chats = await storage.getWritingChatsByUserId(userId);
      res.json({ chats });
    } catch (error) {
      console.error("Get writing chats error:", error);
      res.status(500).json({ message: "Error retrieving writing chats" });
    }
  });

  return httpServer;
}
