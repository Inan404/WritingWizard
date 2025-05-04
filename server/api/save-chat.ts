import { Request, Response } from 'express';
import { db } from '../db';
import { chatSessions, chatMessages } from '@shared/schema';
import { nanoid } from 'nanoid';

interface SaveChatRequest {
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

export async function saveChat(req: Request, res: Response) {
  try {
    const { title, messages } = req.body as SaveChatRequest;
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Create a new chat session
    const [session] = await db
      .insert(chatSessions)
      .values({
        title: title || `Chat ${new Date().toLocaleString()}`,
        inputText: messages?.[0]?.content || 'No content',
        userId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (!session) {
      return res.status(500).json({ error: 'Failed to create chat session' });
    }
    
    // Insert all messages for the chat session
    const messagesWithSessionId = messages.map((msg, index) => ({
      sessionId: session.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(Date.now() + index) // Ensure distinct timestamps
    }));
    
    if (messagesWithSessionId.length > 0) {
      await db
        .insert(chatMessages)
        .values(messagesWithSessionId);
    }
    
    return res.status(201).json({
      success: true,
      sessionId: session.id,
      title: session.title
    });
  } catch (error) {
    console.error('Error saving chat session:', error);
    return res.status(500).json({ 
      error: 'An error occurred while saving the chat session',
      details: error.message 
    });
  }
}