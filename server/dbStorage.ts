import { db } from './db';
import { 
  users, writingEntries, chatSessions, chatMessages,
  type User, type InsertUser,
  type WritingEntry, type InsertWritingEntry,
  type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// Interface for database operations
export interface IDBStorage {
  // Writing data operations
  getWritingEntry(id: number): Promise<WritingEntry | null>;
  getWritingEntriesByUserId(userId: number): Promise<WritingEntry[]>;
  createWritingEntry(entry: InsertWritingEntry): Promise<WritingEntry | null>;
  updateWritingEntry(id: number, entry: Partial<InsertWritingEntry>): Promise<WritingEntry | null>;
  deleteWritingEntry(id: number): Promise<boolean>;
  
  // Chat operations
  getChatSession(id: number): Promise<ChatSession | null>;
  getChatSessionsByUserId(userId: number): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession | null>;
  updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | null>;
  deleteChatSession(id: number): Promise<boolean>;
  
  // Chat messages
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage | null>;
  deleteChatMessages(sessionId: number): Promise<boolean>;
}

// Database storage implementation
export class DatabaseStorage implements IDBStorage {
  // Writing entry operations
  async getWritingEntry(id: number): Promise<WritingEntry | null> {
    const [entry] = await db.select().from(writingEntries).where(eq(writingEntries.id, id));
    return entry || null;
  }
  
  async getWritingEntriesByUserId(userId: number): Promise<WritingEntry[]> {
    return await db.select().from(writingEntries)
      .where(eq(writingEntries.userId, userId))
      .orderBy(desc(writingEntries.updatedAt));
  }
  
  async createWritingEntry(entry: InsertWritingEntry): Promise<WritingEntry | null> {
    const [newEntry] = await db.insert(writingEntries).values(entry).returning();
    return newEntry || null;
  }
  
  async updateWritingEntry(id: number, entry: Partial<InsertWritingEntry>): Promise<WritingEntry | null> {
    const [updatedEntry] = await db.update(writingEntries)
      .set({
        ...entry,
        updatedAt: new Date()
      })
      .where(eq(writingEntries.id, id))
      .returning();
    return updatedEntry || null;
  }
  
  async deleteWritingEntry(id: number): Promise<boolean> {
    const [deleted] = await db.delete(writingEntries)
      .where(eq(writingEntries.id, id))
      .returning();
    return !!deleted;
  }
  
  // Chat session operations
  async getChatSession(id: number): Promise<ChatSession | null> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || null;
  }
  
  async getChatSessionsByUserId(userId: number): Promise<ChatSession[]> {
    return await db.select().from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }
  
  async createChatSession(session: InsertChatSession): Promise<ChatSession | null> {
    const [newSession] = await db.insert(chatSessions).values(session).returning();
    return newSession || null;
  }
  
  async updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | null> {
    const [updatedSession] = await db.update(chatSessions)
      .set({
        ...session,
        updatedAt: new Date()
      })
      .where(eq(chatSessions.id, id))
      .returning();
    return updatedSession || null;
  }
  
  async deleteChatSession(id: number): Promise<boolean> {
    // First delete all messages
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
    
    // Then delete the session
    const [deleted] = await db.delete(chatSessions)
      .where(eq(chatSessions.id, id))
      .returning();
    return !!deleted;
  }
  
  // Chat message operations
  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.timestamp);
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage | null> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    
    // Update session's updated_at time
    if (newMessage) {
      await db.update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, message.sessionId));
    }
    
    return newMessage || null;
  }
  
  async deleteChatMessages(sessionId: number): Promise<boolean> {
    const [deleted] = await db.delete(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .returning();
    return !!deleted;
  }
}

// Export a singleton instance for use throughout the app
export const dbStorage = new DatabaseStorage();