import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // All API routes should be prefixed with /api
  
  // Grammar check API
  app.post('/api/grammar-check', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }
      
      // Import the grammar check functionality
      const { checkGrammar } = await import('./api/grammar-check');
      const result = await checkGrammar(text);
      
      return res.json(result);
    } catch (error) {
      console.error("Grammar check error:", error);
      return res.status(500).json({ message: "Failed to check grammar" });
    }
  });
  
  // Paraphrase API
  app.post('/api/paraphrase', async (req, res) => {
    try {
      const { text, style } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }
      
      // Import the paraphrase functionality
      const { paraphraseText } = await import('./api/paraphrase');
      const result = await paraphraseText(text, style);
      
      return res.json(result);
    } catch (error) {
      console.error("Paraphrase error:", error);
      return res.status(500).json({ message: "Failed to paraphrase text" });
    }
  });
  
  // Humanize API
  app.post('/api/humanize', async (req, res) => {
    try {
      const { text, style } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }
      
      // Import the humanize functionality
      const { humanizeText } = await import('./api/humanize');
      const result = await humanizeText(text, style);
      
      return res.json(result);
    } catch (error) {
      console.error("Humanize error:", error);
      return res.status(500).json({ message: "Failed to humanize text" });
    }
  });
  
  // AI Check API
  app.post('/api/ai-check', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ message: "Text is required" });
      }
      
      // Import the AI check functionality
      const { checkAIContent } = await import('./api/ai-check');
      const result = await checkAIContent(text);
      
      return res.json(result);
    } catch (error) {
      console.error("AI check error:", error);
      return res.status(500).json({ message: "Failed to check AI content" });
    }
  });
  
  // Generate Writing API
  app.post('/api/generate-writing', async (req, res) => {
    try {
      const { 
        originalSample, 
        referenceUrl, 
        topic, 
        length, 
        style, 
        additionalInstructions 
      } = req.body;
      
      if (!originalSample || typeof originalSample !== 'string') {
        return res.status(400).json({ message: "Original writing sample is required" });
      }
      
      if (!topic || typeof topic !== 'string') {
        return res.status(400).json({ message: "Topic is required" });
      }
      
      // Import the generate writing functionality
      const { generateWriting } = await import('./api/generate-writing');
      const result = await generateWriting({
        originalSample,
        referenceUrl,
        topic,
        length,
        style,
        additionalInstructions
      });
      
      // Store the chat in Supabase
      try {
        const { storeWritingChat } = await import('./utils/ai-utils');
        await storeWritingChat({
          rawText: originalSample,
          prompt: {
            topic,
            style,
            length,
            additionalInstructions
          },
          result: result.generatedText,
          metadata: {
            referenceUrl: referenceUrl || null
          }
        });
      } catch (dbError) {
        console.error("Failed to store writing chat:", dbError);
        // Continue with the response even if storage fails
      }
      
      return res.json(result);
    } catch (error) {
      console.error("Generate writing error:", error);
      return res.status(500).json({ message: "Failed to generate writing" });
    }
  });
  
  const httpServer = createServer(app);
  
  return httpServer;
}
