import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { dbStorage } from "./dbStorage"; 
import { 
  generateGrammarCheck, 
  generateParaphrase, 
  generateHumanized, 
  checkAIContent, 
  generateWriting,
  generateChatResponse 
} from "./services/aiService";
import { checkGrammarWithLanguageTool } from "./services/languageToolService";
import { processAi } from "./api/processAi";
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
  
  // Unified AI processing endpoint (follows the guideline design)
  // AI Processing endpoint - protected by authentication
  app.post("/api/ai/process", isAuthenticated, processAi);

  // Individual endpoints (legacy support)
  // Grammar check endpoint
  app.post("/api/grammar-check", async (req, res) => {
    try {
      const { text } = req.body;
      const language = req.body.language || 'en-US';
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
      }
      
      try {
        // Use LanguageTool API for grammar checking
        console.log("Using LanguageTool API for grammar check with language:", language);
        const result = await checkGrammarWithLanguageTool(text, language);
        
        // Transform the result to match the expected format for the UI
        const transformedResult = {
          corrected: result.correctedText,
          highlights: result.errors?.map(err => ({
            id: err.id,
            start: err.position?.start || 0,
            end: err.position?.end || 0,
            type: err.type
          })) || [],
          suggestions: [
            ...(result.errors?.map(err => ({
              id: err.id,
              type: err.type,
              text: err.errorText,
              replacement: err.replacementText,
              description: err.description
            })) || []),
            ...(result.suggestions?.map(sugg => ({
              id: sugg.id,
              type: sugg.type,
              text: sugg.originalText,
              replacement: sugg.suggestedText,
              description: sugg.description
            })) || [])
          ],
          metrics: result.metrics
        };
        
        return res.json(transformedResult);
      } catch (languageToolError) {
        console.error("LanguageTool grammar check error:", languageToolError);
        
        // Fallback to Perplexity AI if LanguageTool fails
        console.log("Falling back to Perplexity API for grammar check");
        const result = await generateGrammarCheck(text);
        return res.json(result);
      }
    } catch (error) {
      console.error("Grammar check error:", error);
      res.status(500).json({ message: "Error checking grammar" });
    }
  });

  // Paraphrase endpoint
  app.post("/api/paraphrase", async (req, res) => {
    try {
      const { text, style } = req.body;
      
      console.log("Received paraphrase request with style:", style);
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
      }
      
      const result = await generateParaphrase(text, style || 'standard');
      console.log("Paraphrase result:", { 
        paraphrasedTextLength: result.paraphrased?.length,
        metricsAvailable: !!result.metrics
      });
      
      // Return result with consistent key name
      res.json({
        paraphrasedText: result.paraphrased,
        metrics: result.metrics
      });
    } catch (error) {
      console.error("Paraphrase error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error paraphrasing text", error: errorMessage });
    }
  });

  // Humanize endpoint
  app.post("/api/humanize", async (req, res) => {
    try {
      const { text, style } = req.body;
      
      console.log("Received humanize request with style:", style);
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
      }
      
      const result = await generateHumanized(text, style || 'standard');
      console.log("Humanize result:", { 
        humanizedTextLength: result.humanized?.length,
        metricsAvailable: !!result.metrics
      });
      
      // Return result with consistent key names
      res.json({
        humanizedText: result.humanized,
        metrics: result.metrics
      });
    } catch (error) {
      console.error("Humanize error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Error humanizing text", error: errorMessage });
    }
  });

  // AI check endpoint
  app.post("/api/ai-check", async (req, res) => {
    try {
      const { text } = req.body;
      
      console.log("Received AI check request");
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Invalid text input" });
      }
      
      const result = await checkAIContent(text);
      console.log("AI check result:", { 
        textLength: result.aiAnalyzed?.length,
        highlightsCount: result.highlights?.length,
        suggestionsCount: result.suggestions?.length,
        aiPercentage: result.aiPercentage
      });
      
      res.json(result);
    } catch (error) {
      console.error("AI check error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        message: "Error checking AI content", 
        error: errorMessage 
      });
    }
  });
  
  // Duplicate endpoint removed

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
  app.post("/api/writing-entries", isAuthenticated, async (req, res) => {
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

  app.get("/api/writing-entries", isAuthenticated, async (req, res) => {
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
  
  app.get("/api/writing-entries/:id", isAuthenticated, async (req, res) => {
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
  
  // Comment: The writing chats endpoint is defined more completely below
  
  // Create new writing chat entry
  app.post("/api/writing-chats", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        console.log("API writing-chats: User not authenticated");
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { title, inputText } = req.body;
      
      if (!title || !inputText) {
        console.log("API writing-chats: Missing required fields:", { title, inputText });
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      console.log(`API writing-chats: Creating chat for user ${req.user.id} with title "${title}"`);
      
      // Create chat session 
      const chatSession = await dbStorage.createChatSession({
        userId: req.user!.id, // We've already checked if req.user exists
        name: title, // Use name instead of title for the chatSession schema
        isFavorite: false
      });
      
      if (!chatSession) {
        return res.status(500).json({ error: 'Failed to create chat' });
      }
      
      // Create initial message
      await dbStorage.createChatMessage({
        sessionId: chatSession.id,
        role: 'user',
        content: inputText
      });
      
      // Use standardized response format matching other session endpoints
      return res.status(201).json({ 
        success: true, 
        chat: {
          id: chatSession.id,
          title: chatSession.name,
          inputText: inputText,
          grammarResult: null,
          paraphraseResult: null,
          aiCheckResult: null,
          humanizeResult: null,
          isFavorite: chatSession.isFavorite,
          userId: chatSession.userId,
          createdAt: chatSession.createdAt.toISOString(),
          updatedAt: chatSession.updatedAt.toISOString()
        }
      });
    } catch (error) {
      console.error('Error creating writing chat:', error);
      return res.status(500).json({ error: 'Failed to create writing chat' });
    }
  });
  
  // Chat sessions endpoints 
  app.post("/api/chat-sessions", isAuthenticated, async (req, res) => {
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
  
  app.get("/api/chat-sessions", isAuthenticated, async (req, res) => {
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
  app.post("/api/chat-sessions/:id/messages", isAuthenticated, async (req, res) => {
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
  
  // AI Chat response endpoint
  app.post("/api/chat-generate", isAuthenticated, async (req, res) => {
    try {
      const { sessionId, messages } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }
      
      // Special case: If sessionId is 0, we don't save to the database
      // (for simplified chat with no persistence)
      const skipPersistence = sessionId === 0;
      
      if (!skipPersistence) {
        // Verify the session belongs to the user
        const session = await dbStorage.getChatSession(sessionId);
        if (!session || session.userId !== req.user?.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Format messages for the AI model
      const aiMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Validate message sequence - Perplexity requires user/assistant alternation ending with user
      let lastRole = '';
      let invalidSequence = false;
      let correctedMessages = [...aiMessages];
      
      // Check for consecutive user messages and properly format them
      for (let i = 0; i < correctedMessages.length; i++) {
        if (i > 0 && correctedMessages[i].role === 'user' && correctedMessages[i-1].role === 'user') {
          console.log('Fixing invalid message sequence: consecutive user messages');
          // Combine consecutive user messages
          correctedMessages[i-1].content += "\n\n" + correctedMessages[i].content;
          // Mark for removal
          invalidSequence = true;
          correctedMessages[i].role = '_remove_';
        }
        lastRole = correctedMessages[i].role;
      }
      
      // Remove marked messages
      if (invalidSequence) {
        correctedMessages = correctedMessages.filter(msg => msg.role !== '_remove_');
      }
      
      // Ensure the last message is from the user
      if (correctedMessages.length > 0 && correctedMessages[correctedMessages.length - 1].role !== 'user') {
        console.log('Warning: Last message is not from the user, this may cause issues with the Perplexity API');
      }
      
      // Record start time for performance tracking
      const startTime = Date.now();
      
      // Generate AI response using the Llama model
      const aiResponse = await generateChatResponse(correctedMessages);
      
      // Record completion time
      const aiGenerationTime = Date.now() - startTime;
      console.log(`AI response generated in ${aiGenerationTime}ms`);
      
      // Return the AI response immediately
      res.json({
        aiResponse,
        responseTime: aiGenerationTime
      });
      
      // Only save to database if we're not in skip persistence mode
      if (!skipPersistence) {
        try {
          // Save the AI response to the database (don't block response with this)
          const savedMessage = await dbStorage.createChatMessage({
            sessionId: sessionId,
            role: 'assistant',
            content: aiResponse
          });
          console.log(`AI response saved to database for session ${sessionId}`);
        } catch (dbError) {
          console.error(`Error saving AI response to database for session ${sessionId}:`, dbError);
        }
      } else {
        console.log('Skipping database persistence for session ID 0');
      }
      console.log(`AI response saved to database for session ${sessionId}`);
    } catch (error) {
      console.error('Error generating AI chat response:', error);
      console.error('Error details:', error);
      res.status(500).json({ 
        error: 'Failed to generate AI response', 
        aiResponse: "I apologize, but I'm having trouble connecting to my AI services right now. Please try again in a moment."
      });
    }
  });
  
  app.get("/api/chat-sessions/:id/messages", isAuthenticated, async (req, res) => {
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
  
  // Delete chat session endpoint - non-DB version (legacy)
  app.delete("/api/chat-sessions/:id", isAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      // Verify user owns this session
      const session = await dbStorage.getChatSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Chat session not found" });
      }
      
      // Check if user owns this session
      if (!req.user || session.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Delete the chat session and its messages
      const result = await dbStorage.deleteChatSession(sessionId);
      
      if (result) {
        res.json({ success: true, message: "Chat session deleted successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to delete chat session" });
      }
    } catch (error) {
      console.error("Delete chat session error:", error);
      res.status(500).json({ success: false, message: "Error deleting chat session" });
    }
  });
  
  // Delete chat session endpoint - DB version
  app.delete("/api/db/chat-sessions/:id", isAuthenticated, async (req, res) => {
    try {
      console.log("Delete chat session request received for session:", req.params.id);
      const sessionId = parseInt(req.params.id);
      
      if (isNaN(sessionId)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }
      
      // Verify user owns this session
      const session = await dbStorage.getChatSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      
      // Ensure the user owns this session
      if (!req.user || session.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      console.log(`Deleting chat session ${sessionId} and its messages...`);
      
      // First delete all messages for this session
      await dbStorage.deleteChatMessages(sessionId);
      
      // Then delete the session itself
      const result = await dbStorage.deleteChatSession(sessionId);
      
      if (result) {
        console.log(`Successfully deleted chat session ${sessionId}`);
        
        // Clear any cache for this session
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.status(200).json({ 
          success: true, 
          message: "Chat session deleted successfully",
          timestamp: Date.now() // Add timestamp for cache busting
        });
      } else {
        console.error(`Failed to delete chat session ${sessionId}`);
        res.status(500).json({ 
          success: false, 
          error: "Failed to delete chat session" 
        });
      }
    } catch (error) {
      console.error("Delete chat session error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Error deleting chat session", 
        details: error instanceof Error ? error.message : String(error)
      });
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
        // Set cache control headers to prevent browser caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        
        // Add a timestamp query parameter to the URL to prevent browser caching
        const timestamp = new Date().getTime();
        
        // Fetch chat sessions from the database
        // Convert userId to number if it's a string
        const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId;
        const userChatSessions = await dbStorage.getChatSessionsByUserId(numericUserId);
        
        console.log(`[${timestamp}] Found ${userChatSessions.length} chat sessions for user ${numericUserId}`);
        
        // Convert chat sessions to the expected format for the sidebar
        // We need to adapt the chat sessions to the expected WritingChat format for the UI
        const chatSessionsAsWritingChats = await Promise.all(userChatSessions.map(async (session) => {
          // Get the first message of the session to use as title if available
          const chatMessages = await dbStorage.getChatMessages(session.id);
          const firstMessage = chatMessages.length > 0 ? chatMessages[0] : null;
          
          // For debugging
          if (chatMessages.length > 0) {
            console.log(`Session ${session.id} has ${chatMessages.length} messages`);
          }
          
          // Create a writing entry from the chat session
          return {
            id: session.id,
            title: session.name || `Chat ${session.id}`,
            inputText: firstMessage?.content || '',
            grammarResult: null,
            paraphraseResult: null,
            aiCheckResult: null,
            humanizeResult: null,
            isFavorite: session.isFavorite || false, // Use the actual isFavorite value from the database
            userId: session.userId,
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString()
          };
        }));
        
        // Return the chat sessions as writing chats - IMPORTANT! Add timestamp here to prevent caching
        res.json({
          chats: chatSessionsAsWritingChats,
          timestamp: timestamp // Add timestamp to force client to recognize this as a new response
        });
      } catch (dbError) {
        console.error("Database error when fetching chats:", dbError);
        // Return empty array if database query fails
        return res.json({
          chats: [],
          timestamp: new Date().getTime() // Add timestamp even for error responses
        });
      }
    } catch (error) {
      console.error("Get writing chats error:", error);
      res.status(500).json({ 
        message: "Error retrieving writing chats",
        timestamp: new Date().getTime() // Add timestamp even for error responses 
      });
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
  
  // This endpoint is now handled by the unified implementation at the end of the file
  
  // Chat messages direct API by ID
  app.get('/api/chat-messages/:chatId', isAuthenticated, async (req, res) => {
    try {
      const chatId = parseInt(req.params.chatId);
      
      if (isNaN(chatId)) {
        return res.status(400).json({ error: 'Invalid chat ID' });
      }
      
      // Get the chat session to verify ownership
      const chatSession = await dbStorage.getChatSession(chatId);
      
      if (!chatSession) {
        return res.status(404).json({ error: 'Chat session not found' });
      }
      
      // Verify the user owns this chat session
      if (chatSession.userId !== req.user?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get the messages for this chat session
      const messages = await dbStorage.getChatMessages(chatId);
      
      // Return the messages
      return res.json(messages);
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return res.status(500).json({ error: 'Failed to retrieve chat messages' });
    }
  });
  
  // Chat messages API by session ID
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
  
  // Toggle favorite status of a chat session
  app.patch('/api/db/chat-sessions/:id/favorite', isAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
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
      
      // Toggle the favorite status
      const updatedSession = await dbStorage.updateChatSession(sessionId, {
        isFavorite: !session.isFavorite
      });
      
      if (updatedSession) {
        res.json({ 
          success: true,
          session: updatedSession
        });
      } else {
        res.status(500).json({ error: 'Failed to update favorite status' });
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Save chat sessions with messages from the BareMinimumChat component
  app.post("/api/db/chat-sessions", isAuthenticated, async (req, res) => {
    try {
      const { title, messages, name } = req.body;
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Create chat session
      const chatSession = await dbStorage.createChatSession({
        userId: req.user.id,
        name: name || title || `Chat ${new Date().toLocaleString()}`,
        isFavorite: false
      });
      
      if (!chatSession) {
        return res.status(500).json({ error: 'Failed to create chat session' });
      }
      
      // Insert messages if present
      if (messages && Array.isArray(messages) && messages.length > 0) {
        for (const message of messages) {
          await dbStorage.createChatMessage({
            sessionId: chatSession.id,
            role: message.role,
            content: message.content
          });
        }
      }
      
      // Standardized response format
      return res.status(201).json({
        success: true,
        session: {
          id: chatSession.id,
          name: chatSession.name,
          createdAt: chatSession.createdAt,
          updatedAt: chatSession.updatedAt,
          userId: chatSession.userId,
          isFavorite: chatSession.isFavorite
        }
      });
    } catch (error) {
      console.error('Error saving chat session:', error);
      console.error(error);
      return res.status(500).json({ 
        error: 'Failed to save chat session',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return httpServer;
}