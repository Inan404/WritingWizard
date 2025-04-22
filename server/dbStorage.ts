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
    // Using camelCase in code but matching the actual column names in the SQL query
    return await db.execute(
      `SELECT * FROM writing_entries WHERE userid = $1 ORDER BY updatedat DESC`,
      [userId]
    );
  }
  
  async createWritingEntry(entry: InsertWritingEntry): Promise<WritingEntry | null> {
    // Using camelCase in code but matching the actual column names in the SQL query
    const [newEntry] = await db.execute(
      `INSERT INTO writing_entries 
       (userid, title, inputtext, grammarresult, paraphraseresult, aicheckresult, humanizeresult, isfavorite) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        entry.userId, 
        entry.title || 'Untitled', 
        entry.inputText || '', 
        entry.grammarResult || null, 
        entry.paraphraseResult || null, 
        entry.aiCheckResult || null, 
        entry.humanizerResult || null, 
        entry.isFavorite || false
      ]
    );
    
    return newEntry;
  }
  
  async updateWritingEntry(id: number, entry: Partial<InsertWritingEntry>): Promise<WritingEntry | null> {
    // Build SET clause dynamically based on provided fields
    const updateFields = [];
    const values = [id];
    let paramIndex = 2; // starting with $2 since $1 is the id
    
    if (entry.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(entry.title);
    }
    
    if (entry.inputText !== undefined) {
      updateFields.push(`inputtext = $${paramIndex++}`);
      values.push(entry.inputText);
    }
    
    if (entry.grammarResult !== undefined) {
      updateFields.push(`grammarresult = $${paramIndex++}`);
      values.push(entry.grammarResult);
    }
    
    if (entry.paraphraseResult !== undefined) {
      updateFields.push(`paraphraseresult = $${paramIndex++}`);
      values.push(entry.paraphraseResult);
    }
    
    if (entry.aiCheckResult !== undefined) {
      updateFields.push(`aicheckresult = $${paramIndex++}`);
      values.push(entry.aiCheckResult);
    }
    
    if (entry.humanizerResult !== undefined) {
      updateFields.push(`humanizeresult = $${paramIndex++}`);
      values.push(entry.humanizerResult);
    }
    
    if (entry.isFavorite !== undefined) {
      updateFields.push(`isfavorite = $${paramIndex++}`);
      values.push(entry.isFavorite);
    }
    
    // Add updated timestamp
    updateFields.push(`updatedat = NOW()`);
    
    if (updateFields.length === 0) {
      return await this.getWritingEntry(id); // Nothing to update, return current entry
    }
    
    const [updatedEntry] = await db.execute(
      `UPDATE writing_entries SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    
    return updatedEntry || null;
  }
  
  async deleteWritingEntry(id: number): Promise<boolean> {
    const result = await db.execute(
      `DELETE FROM writing_entries WHERE id = $1`,
      [id]
    );
    
    return result.rowCount > 0;
  }
  
  // Chat session operations
  async getChatSession(id: number): Promise<ChatSession | null> {
    const [session] = await db.execute(
      `SELECT * FROM chat_sessions WHERE id = $1`,
      [id]
    );
    
    return session || null;
  }
  
  async getChatSessionsByUserId(userId: number): Promise<ChatSession[]> {
    return await db.execute(
      `SELECT * FROM chat_sessions WHERE userid = $1 ORDER BY updatedat DESC`,
      [userId]
    );
  }
  
  async createChatSession(session: InsertChatSession): Promise<ChatSession | null> {
    const [newSession] = await db.execute(
      `INSERT INTO chat_sessions (userid, name) VALUES ($1, $2) RETURNING *`,
      [session.userId, session.name || 'New Chat']
    );
    
    return newSession;
  }
  
  async updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | null> {
    // Build SET clause dynamically based on provided fields
    const updateFields = [];
    const values = [id];
    let paramIndex = 2; // starting with $2 since $1 is the id
    
    if (session.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(session.name);
    }
    
    // Add updated timestamp
    updateFields.push(`updatedat = NOW()`);
    
    if (updateFields.length === 0) {
      return await this.getChatSession(id); // Nothing to update, return current session
    }
    
    const [updatedSession] = await db.execute(
      `UPDATE chat_sessions SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    
    return updatedSession || null;
  }
  
  async deleteChatSession(id: number): Promise<boolean> {
    // First delete any associated messages
    await this.deleteChatMessages(id);
    
    const result = await db.execute(
      `DELETE FROM chat_sessions WHERE id = $1`,
      [id]
    );
    
    return result.rowCount > 0;
  }
  
  // Chat message operations
  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db.execute(
      `SELECT * FROM chat_messages WHERE sessionid = $1 ORDER BY timestamp ASC`,
      [sessionId]
    );
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage | null> {
    const [newMessage] = await db.execute(
      `INSERT INTO chat_messages (sessionid, role, content) VALUES ($1, $2, $3) RETURNING *`,
      [message.sessionId, message.role, message.content]
    );
    
    return newMessage;
  }
  
  async deleteChatMessages(sessionId: number): Promise<boolean> {
    const result = await db.execute(
      `DELETE FROM chat_messages WHERE sessionid = $1`,
      [sessionId]
    );
    
    return true; // Always return true, even if no messages were deleted
  }
}

export const dbStorage = new DatabaseStorage();
