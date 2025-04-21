import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dbStorage } from "./dbStorage"; 
import { generateGrammarCheck, generateParaphrase, generateHumanized, checkAIContent, generateWriting } from "./services/aiService";
import { setupAuth } from "./auth";
import { ensureTablesExist } from "./db";

// Middleware to check if the user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "You must be logged in to access this resource" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Ensure database tables exist
  await ensureTablesExist();
  
  // Set up authentication
  setupAuth(app);

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

  // Writing entries endpoints
  app.post("/api/writing-entries", async (req, res) => {
    try {
      const { title, inputText, grammarResult, paraphraseResult, aiCheckResult, humanizerResult } = req.body;
      
      if (!inputText || typeof inputText !== "string") {
        return res.status(400).json({ message: "Input text is required" });
      }
      
      const user = await storage.getCurrentUser();
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Convert string id to number if needed
      const userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      
      const entry = await storage.createWritingEntry({
        userId,
        title: title || "Untitled",
        inputText,
        grammarResult,
        paraphraseResult,
        aiCheckResult,
        humanizerResult,
        isFavorite: false
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
      
      const entries = await storage.getWritingEntriesByUserId(user.id.toString());
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
      
      // Convert both IDs to strings for comparison to handle different types
      if (!entry || !user.id || entry.userId.toString() !== user.id.toString()) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      res.json({ entry });
    } catch (error) {
      console.error("Get writing entry error:", error);
      res.status(500).json({ message: "Error retrieving writing entry" });
    }
  });
  
  // Chat sessions endpoints
  app.post("/api/chat-sessions", async (req, res) => {
    try {
      const { name } = req.body;
      
      const user = await storage.getCurrentUser();
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Convert string id to number if needed
      const userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
      
      const chatSession = await storage.createChatSession({
        userId,
        name: name || "New Chat"
      });
      
      res.json({ chatSession });
    } catch (error) {
      console.error("Save chat session error:", error);
      res.status(500).json({ message: "Error saving chat session" });
    }
  });
  
  app.get("/api/chat-sessions", async (req, res) => {
    try {
      const user = await storage.getCurrentUser();
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const sessions = await storage.getChatSessionsByUserId(user.id.toString());
      res.json({ sessions });
    } catch (error) {
      console.error("Get chat sessions error:", error);
      res.status(500).json({ message: "Error retrieving chat sessions" });
    }
  });
  
  // Chat messages endpoints
  app.post("/api/chat-sessions/:id/messages", async (req, res) => {
    try {
      const { role, content } = req.body;
      const sessionId = parseInt(req.params.id);
      
      if (!role || !content) {
        return res.status(400).json({ message: "Role and content are required" });
      }
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      const user = await storage.getCurrentUser();
      
      if (!session || !user || !user.id || session.userId.toString() !== user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const message = await storage.createChatMessage({
        sessionId,
        role,
        content
      });
      
      res.json({ message });
    } catch (error) {
      console.error("Save chat message error:", error);
      res.status(500).json({ message: "Error saving chat message" });
    }
  });
  
  app.get("/api/chat-sessions/:id/messages", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      const user = await storage.getCurrentUser();
      
      if (!session || !user || !user.id || session.userId.toString() !== user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getChatMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error("Get chat messages error:", error);
      res.status(500).json({ message: "Error retrieving chat messages" });
    }
  });
  
  // Get writing chats - temporary non-authenticated route for testing
  app.get("/api/writing-chats", async (req, res) => {
    try {
      // For development purposes, return mock data until we have proper auth
      res.json({
        chats: [
          {
            id: 1,
            name: "Sample Essay on Climate Change",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 2,
            name: "Research Paper on Artificial Intelligence",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      });
    } catch (error) {
      console.error("Get writing chats error:", error);
      res.status(500).json({ message: "Error retrieving writing chats" });
    }
  });

  // New DB-based API endpoints protected by authentication
  
  // Writing entries API
  app.get('/api/db/writing-entries', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Handle potential string ID
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      
      const entries = await dbStorage.getWritingEntriesByUserId(numericUserId);
      res.json({ entries });
    } catch (error) {
      console.error('Error getting writing entries:', error);
      res.status(500).json({ error: 'Failed to retrieve writing entries' });
    }
  });
  
  app.post('/api/db/writing-entries', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Handle potential string ID
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      
      const { title, inputText, grammarResult, paraphraseResult, aiCheckResult, humanizerResult } = req.body;
      
      if (!inputText) {
        return res.status(400).json({ error: 'Input text is required' });
      }
      
      const entry = await dbStorage.createWritingEntry({
        userId: numericUserId,
        title: title || 'Untitled',
        inputText,
        grammarResult,
        paraphraseResult,
        aiCheckResult,
        humanizerResult,
        isFavorite: false
      });
      
      res.status(201).json({ entry });
    } catch (error) {
      console.error('Error creating writing entry:', error);
      res.status(500).json({ error: 'Failed to create writing entry' });
    }
  });
  
  app.get('/api/db/writing-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      const entry = await dbStorage.getWritingEntry(id);
      if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      
      // Compare both as strings to handle type differences
      const userId = req.user?.id;
      if (!userId || entry.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json({ entry });
    } catch (error) {
      console.error('Error getting writing entry:', error);
      res.status(500).json({ error: 'Failed to retrieve writing entry' });
    }
  });
  
  // Chat sessions API
  app.get('/api/db/chat-sessions', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Handle potential string ID
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      
      const sessions = await dbStorage.getChatSessionsByUserId(numericUserId);
      res.json({ sessions });
    } catch (error) {
      console.error('Error getting chat sessions:', error);
      res.status(500).json({ error: 'Failed to retrieve chat sessions' });
    }
  });
  
  app.post('/api/db/chat-sessions', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Handle potential string ID
      const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
      
      const { name } = req.body;
      
      const session = await dbStorage.createChatSession({
        userId: numericUserId,
        name: name || 'New Chat'
      });
      
      res.status(201).json({ session });
    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });
  
  // Chat messages API
  app.get('/api/db/chat-sessions/:sessionId/messages', isAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }
      
      // First check if the session belongs to the user
      const session = await dbStorage.getChatSession(sessionId);
      const userId = req.user?.id;
      
      // Compare both as strings to handle type differences
      if (!session || !userId || session.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const messages = await dbStorage.getChatMessages(sessionId);
      res.json({ messages });
    } catch (error) {
      console.error('Error getting chat messages:', error);
      res.status(500).json({ error: 'Failed to retrieve chat messages' });
    }
  });
  
  app.post('/api/db/chat-sessions/:sessionId/messages', isAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }
      
      // First check if the session belongs to the user
      const session = await dbStorage.getChatSession(sessionId);
      const userId = req.user?.id;
      
      // Compare both as strings to handle type differences
      if (!session || !userId || session.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const { role, content } = req.body;
      
      if (!role || !content) {
        return res.status(400).json({ error: 'Role and content are required' });
      }
      
      const message = await dbStorage.createChatMessage({
        sessionId,
        role,
        content
      });
      
      res.status(201).json({ message });
    } catch (error) {
      console.error('Error creating chat message:', error);
      res.status(500).json({ error: 'Failed to create chat message' });
    }
  });

  return httpServer;
}