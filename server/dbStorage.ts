import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  writingEntries, 
  chatSessions, 
  chatMessages, 
  type WritingEntry, 
  type InsertWritingEntry, 
  type ChatSession, 
  type InsertChatSession, 
  type ChatMessage, 
  type InsertChatMessage
} from "@shared/schema";

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

export class DatabaseStorage implements IDBStorage {
  // Writing entry operations
  async getWritingEntry(id: number): Promise<WritingEntry | null> {
    const [entry] = await db.select().from(writingEntries).where(eq(writingEntries.id, id));
    return entry || null;
  }
  
  async getWritingEntriesByUserId(userId: number): Promise<WritingEntry[]> {
    try {
      const entries = await db
        .select()
        .from(writingEntries)
        .where(eq(writingEntries.userId, userId))
        .orderBy(desc(writingEntries.updatedAt));
      return entries || [];
    } catch (error) {
      console.error("Error fetching writing entries:", error);
      return []; // Return empty array on error
    }
  }
  
  async createWritingEntry(entry: InsertWritingEntry): Promise<WritingEntry | null> {
    try {
      const [newEntry] = await db
        .insert(writingEntries)
        .values({
          userId: entry.userId,
          title: entry.title || 'Untitled',
          inputText: entry.inputText || '',
          grammarResult: entry.grammarResult || null,
          paraphraseResult: entry.paraphraseResult || null,
          aiCheckResult: entry.aiCheckResult || null,
          humanizerResult: entry.humanizerResult || null,
          isFavorite: entry.isFavorite || false
        })
        .returning();
      
      return newEntry || null;
    } catch (error) {
      console.error("Error creating writing entry:", error);
      return null;
    }
  }
  
  async updateWritingEntry(id: number, entry: Partial<InsertWritingEntry>): Promise<WritingEntry | null> {
    try {
      // Create an object with only the properties to update
      const updateData: Partial<InsertWritingEntry> = {};
      
      if (entry.title !== undefined) updateData.title = entry.title;
      if (entry.inputText !== undefined) updateData.inputText = entry.inputText;
      if (entry.grammarResult !== undefined) updateData.grammarResult = entry.grammarResult;
      if (entry.paraphraseResult !== undefined) updateData.paraphraseResult = entry.paraphraseResult;
      if (entry.aiCheckResult !== undefined) updateData.aiCheckResult = entry.aiCheckResult;
      if (entry.humanizerResult !== undefined) updateData.humanizerResult = entry.humanizerResult;
      if (entry.isFavorite !== undefined) updateData.isFavorite = entry.isFavorite;
      
      // If no fields to update, return current entry
      if (Object.keys(updateData).length === 0) {
        return await this.getWritingEntry(id);
      }
      
      const [updatedEntry] = await db
        .update(writingEntries)
        .set(updateData)
        .where(eq(writingEntries.id, id))
        .returning();
      
      return updatedEntry || null;
    } catch (error) {
      console.error("Error updating writing entry:", error);
      return null;
    }
  }
  
  async deleteWritingEntry(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(writingEntries)
        .where(eq(writingEntries.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting writing entry:", error);
      return false;
    }
  }
  
  // Chat session operations
  async getChatSession(id: number): Promise<ChatSession | null> {
    try {
      const [session] = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, id));
      
      return session || null;
    } catch (error) {
      console.error("Error getting chat session:", error);
      return null;
    }
  }
  
  async getChatSessionsByUserId(userId: number): Promise<ChatSession[]> {
    try {
      const sessions = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .orderBy(desc(chatSessions.updatedAt));
      
      return sessions || [];
    } catch (error) {
      console.error("Error getting chat sessions:", error);
      return [];
    }
  }
  
  async createChatSession(session: InsertChatSession): Promise<ChatSession | null> {
    try {
      const [newSession] = await db
        .insert(chatSessions)
        .values({
          userId: session.userId,
          name: session.name || 'New Chat'
        })
        .returning();
      
      return newSession || null;
    } catch (error) {
      console.error("Error creating chat session:", error);
      return null;
    }
  }
  
  async updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | null> {
    try {
      // Create an object with only the properties to update
      const updateData: Partial<InsertChatSession> = {};
      
      if (session.name !== undefined) updateData.name = session.name;
      if (session.isFavorite !== undefined) updateData.isFavorite = session.isFavorite;
      
      // If no fields to update, return current session
      if (Object.keys(updateData).length === 0) {
        return await this.getChatSession(id);
      }
      
      // We'll handle updatedAt at the database level
      // Drizzle schema will auto-update the updatedAt field
      
      console.log(`Updating chat session ${id} with data:`, updateData);
      
      const [updatedSession] = await db
        .update(chatSessions)
        .set(updateData)
        .where(eq(chatSessions.id, id))
        .returning();
      
      return updatedSession || null;
    } catch (error) {
      console.error("Error updating chat session:", error);
      return null;
    }
  }
  
  async deleteChatSession(id: number): Promise<boolean> {
    try {
      // First delete any associated messages
      await this.deleteChatMessages(id);
      
      await db
        .delete(chatSessions)
        .where(eq(chatSessions.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting chat session:", error);
      return false;
    }
  }
  
  // Chat message operations
  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    try {
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId))
        .orderBy(chatMessages.timestamp); // Default is ASC
      
      return messages || [];
    } catch (error) {
      console.error("Error getting chat messages:", error);
      return [];
    }
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage | null> {
    try {
      const [newMessage] = await db
        .insert(chatMessages)
        .values({
          sessionId: message.sessionId,
          role: message.role,
          content: message.content
        })
        .returning();
      
      return newMessage || null;
    } catch (error) {
      console.error("Error creating chat message:", error);
      return null;
    }
  }
  
  async deleteChatMessages(sessionId: number): Promise<boolean> {
    try {
      await db
        .delete(chatMessages)
        .where(eq(chatMessages.sessionId, sessionId));
      
      return true;
    } catch (error) {
      console.error("Error deleting chat messages:", error);
      return false;
    }
  }
}

export const dbStorage = new DatabaseStorage();
