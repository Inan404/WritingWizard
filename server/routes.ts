import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateGrammarCheck, generateParaphrase, generateHumanized, checkAIContent, generateWriting } from "./services/aiService";

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
      
      const result = await generateWriting({
        originalSample: sample || '',
        referenceUrl: references,
        topic: instructions,
        length: length,
        style: style,
        additionalInstructions: format
      });
      res.json(result);
    } catch (error) {
      console.error("Generate writing error:", error);
      res.status(500).json({ message: "Error generating writing" });
    }
  });

  // Auth endpoints
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.signUp(email, password);
      
      if (!user) {
        return res.status(400).json({ message: "Failed to create user" });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Error signing up" });
    }
  });
  
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const user = await storage.signIn(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({ message: "Error signing in" });
    }
  });
  
  app.post("/api/auth/signout", async (req, res) => {
    try {
      await storage.signOut();
      res.json({ message: "Signed out successfully" });
    } catch (error) {
      console.error("Signout error:", error);
      res.status(500).json({ message: "Error signing out" });
    }
  });
  
  app.get("/api/auth/user", async (req, res) => {
    try {
      const user = await storage.getCurrentUser();
      res.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Error getting user" });
    }
  });

  // Writing entries endpoints
  app.post("/api/writing-entries", async (req, res) => {
    try {
      const { inputText, grammarResult, paraphraseResult, aiCheckResult, humanizerResult } = req.body;
      
      if (!inputText || typeof inputText !== "string") {
        return res.status(400).json({ message: "Input text is required" });
      }
      
      const user = await storage.getCurrentUser();
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const entry = await storage.createWritingEntry({
        userId: user.id,
        inputText,
        grammarResult,
        paraphraseResult,
        aiCheckResult,
        humanizerResult
      });
      
      res.json({ entry });
    } catch (error) {
      console.error("Save writing entry error:", error);
      res.status(500).json({ message: "Error saving writing entry" });
    }
  });

  app.get("/api/writing-entries", async (req, res) => {
    try {
      const user = await storage.getCurrentUser();
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const entries = await storage.getWritingEntriesByUserId(user.id);
      res.json({ entries });
    } catch (error) {
      console.error("Get writing entries error:", error);
      res.status(500).json({ message: "Error retrieving writing entries" });
    }
  });
  
  app.get("/api/writing-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const user = await storage.getCurrentUser();
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const entry = await storage.getWritingEntry(id);
      
      if (!entry || entry.userId !== user.id) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      res.json({ entry });
    } catch (error) {
      console.error("Get writing entry error:", error);
      res.status(500).json({ message: "Error retrieving writing entry" });
    }
  });
  
  // Chat history endpoints
  app.post("/api/chat-history", async (req, res) => {
    try {
      const { messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages are required" });
      }
      
      const user = await storage.getCurrentUser();
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const chatHistory = await storage.createChatHistory({
        userId: user.id,
        messages
      });
      
      res.json({ chatHistory });
    } catch (error) {
      console.error("Save chat history error:", error);
      res.status(500).json({ message: "Error saving chat history" });
    }
  });
  
  app.get("/api/chat-history", async (req, res) => {
    try {
      const user = await storage.getCurrentUser();
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const histories = await storage.getChatHistoriesByUserId(user.id);
      res.json({ histories });
    } catch (error) {
      console.error("Get chat histories error:", error);
      res.status(500).json({ message: "Error retrieving chat histories" });
    }
  });

  return httpServer;
}
