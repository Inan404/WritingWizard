// Use the types from shared schema
import { 
  type WritingEntry, type InsertWritingEntry,
  type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage,
  type SupabaseUser
} from "@shared/schema";
// Importing Supabase client for authentication and data storage
import { supabase } from "./supabase";
import { dbStorage } from "./dbStorage";

// Interface for database operations with Supabase
export interface IStorage {
  // Authentication operations
  getCurrentUser(): Promise<SupabaseUser | null>;
  signUp(email: string, password: string): Promise<SupabaseUser | null>;
  signIn(email: string, password: string): Promise<SupabaseUser | null>;
  signOut(): Promise<void>;
  
  // Writing entry operations
  getWritingEntry(id: number): Promise<WritingEntry | null>;
  getWritingEntriesByUserId(userId: string): Promise<WritingEntry[]>;
  createWritingEntry(entry: InsertWritingEntry): Promise<WritingEntry | null>;
  updateWritingEntry(id: number, entry: Partial<InsertWritingEntry>): Promise<WritingEntry | null>;
  deleteWritingEntry(id: number): Promise<boolean>;
  
  // Chat session operations
  getChatSession(id: number): Promise<ChatSession | null>;
  getChatSessionsByUserId(userId: string): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession | null>;
  updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | null>;
  deleteChatSession(id: number): Promise<boolean>;
  
  // Chat message operations
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage | null>;
  deleteChatMessages(sessionId: number): Promise<boolean>;
}

// Supabase storage implementation
export class SupabaseStorage implements IStorage {
  // Authentication operations
  async getCurrentUser(): Promise<SupabaseUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user as SupabaseUser | null;
  }

  async signUp(email: string, password: string): Promise<SupabaseUser | null> {
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      console.error('Error signing up:', error);
      return null;
    }
    
    return user as SupabaseUser | null;
  }

  async signIn(email: string, password: string): Promise<SupabaseUser | null> {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Error signing in:', error);
      return null;
    }
    
    return user as SupabaseUser | null;
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
  
  // Writing entry operations
  async getWritingEntry(id: number): Promise<WritingEntry | null> {
    return dbStorage.getWritingEntry(id);
  }
  
  async getWritingEntriesByUserId(userId: string): Promise<WritingEntry[]> {
    // Convert string ID to number for database
    return dbStorage.getWritingEntriesByUserId(parseInt(userId));
  }
  
  async createWritingEntry(entry: InsertWritingEntry): Promise<WritingEntry | null> {
    return dbStorage.createWritingEntry({
      ...entry,
      userId: typeof entry.userId === 'string' ? parseInt(entry.userId) : entry.userId
    });
  }
  
  async updateWritingEntry(id: number, entry: Partial<InsertWritingEntry>): Promise<WritingEntry | null> {
    const processedEntry = { ...entry };
    if (entry.userId && typeof entry.userId === 'string') {
      processedEntry.userId = parseInt(entry.userId);
    }
    return dbStorage.updateWritingEntry(id, processedEntry);
  }
  
  async deleteWritingEntry(id: number): Promise<boolean> {
    return dbStorage.deleteWritingEntry(id);
  }
  
  // Chat session operations
  async getChatSession(id: number): Promise<ChatSession | null> {
    return dbStorage.getChatSession(id);
  }
  
  async getChatSessionsByUserId(userId: string): Promise<ChatSession[]> {
    return dbStorage.getChatSessionsByUserId(parseInt(userId));
  }
  
  async createChatSession(session: InsertChatSession): Promise<ChatSession | null> {
    return dbStorage.createChatSession({
      ...session,
      userId: typeof session.userId === 'string' ? parseInt(session.userId) : session.userId
    });
  }
  
  async updateChatSession(id: number, session: Partial<InsertChatSession>): Promise<ChatSession | null> {
    const processedSession = { ...session };
    if (session.userId && typeof session.userId === 'string') {
      processedSession.userId = parseInt(session.userId);
    }
    return dbStorage.updateChatSession(id, processedSession);
  }
  
  async deleteChatSession(id: number): Promise<boolean> {
    return dbStorage.deleteChatSession(id);
  }
  
  // Chat message operations
  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return dbStorage.getChatMessages(sessionId);
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage | null> {
    return dbStorage.createChatMessage(message);
  }
  
  async deleteChatMessages(sessionId: number): Promise<boolean> {
    return dbStorage.deleteChatMessages(sessionId);
  }
}

// Export an instance of the storage class for use throughout the app
export const storage = new SupabaseStorage();