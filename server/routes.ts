import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dbStorage } from "./dbStorage"; 
import { generateGrammarCheck, generateParaphrase, generateHumanized, checkAIContent, generateWriting } from "./services/aiService";
import { setupAuth } from "./auth";
import { ensureTablesExist } from "./db";

// Function to generate sample writing chats for development/fallback
function getDummyWritingChats() {
  return [
    {
      id: 1,
      title: "Essay on Climate Change",
      inputText: "Climate change is one of the most pressing issues of our time...",
      grammarResult: null,
      paraphraseResult: null,
      aiCheckResult: null,
      humanizeResult: null,
      isFavorite: true,
      userId: 1,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      title: "Research on Artificial Intelligence",
      inputText: "Artificial intelligence has transformed numerous industries...",
      grammarResult: null,
      paraphraseResult: null,
      aiCheckResult: null,
      humanizeResult: null,
      isFavorite: false,
      userId: 1,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      title: "Book Review: 1984 by George Orwell",
      inputText: "George Orwell's dystopian masterpiece 1984 presents a harrowing vision...",
      grammarResult: null,
      paraphraseResult: null,
      aiCheckResult: null,
      humanizeResult: null,
      isFavorite: true,
      userId: 1,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 4,
      title: "Analysis of Economic Trends",
      inputText: "Recent economic trends indicate a shift towards sustainable development...",
      grammarResult: null,
      paraphraseResult: null,
      aiCheckResult: null,
      humanizeResult: null,
      isFavorite: false,
      userId: 1,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 5,
      title: "The Impact of Social Media",
      inputText: "Social media platforms have fundamentally changed how we communicate...",
      grammarResult: null,
      paraphraseResult: null,
      aiCheckResult: null,
      humanizeResult: null,
      isFavorite: false,
      userId: 1,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

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
  
  // Get writing chats for authenticated user
  app.get("/api/writing-chats", isAuthenticated, async (req, res) => {
    try {
      // Get the authenticated user's ID
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      try {
        // Fetch both the chat sessions and any entries from the database
        const userChatSessions = await dbStorage.getChatSessionsByUserId(userId);
        
        // Convert chat sessions to the expected format for the sidebar
        // We need to adapt the chat sessions to the expected WritingChat format for the UI
        const chatSessionsAsWritingChats = await Promise.all(userChatSessions.map(async (session) => {
          // Get the first message of the session to use as title if available
          const chatMessages = await dbStorage.getChatMessages(session.id);
          const firstMessage = chatMessages.length > 0 ? chatMessages[0] : null;
          
          // Create a writing entry from the chat session
          return {
            id: session.id,
            title: session.name || 'New Chat',
            inputText: firstMessage?.content || '',
            grammarResult: null,
            paraphraseResult: null,
            aiCheckResult: null,
            humanizeResult: null,
            isFavorite: false,
            userId: session.userId,
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString()
          };
        }));
        
        // Return the chat sessions as writing chats
        res.json({
          chats: chatSessionsAsWritingChats
        });
      } catch (dbError) {
        console.error("Database error when fetching chats:", dbError);
        // Return empty array if database query fails
        return res.json({
          chats: []
        });
      }
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

  // Update a writing entry (PATCH)
  app.patch('/api/db/writing-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      
      // First check if the user owns this entry
      const entry = await dbStorage.getWritingEntry(id);
      if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      
      // Compare both as strings to handle type differences
      const userId = req.user?.id;
      if (!userId || entry.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Update the entry
      const updatedEntry = await dbStorage.updateWritingEntry(id, req.body);
      
      res.json({ entry: updatedEntry });
    } catch (error) {
      console.error('Error updating writing entry:', error);
      res.status(500).json({ error: 'Failed to update writing entry' });
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