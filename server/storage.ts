// Use the types from shared schema
import { 
  type WritingEntry, type InsertWritingEntry,
  type ChatHistory, type InsertChatHistory,
  type SupabaseUser, type ChatMessage 
} from "@shared/schema";
// We'll integrate Supabase properly later
// import { supabase } from "./supabase";
import { eq } from "drizzle-orm";

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
  
  // Chat history operations
  getChatHistory(id: number): Promise<ChatHistory | null>;
  getChatHistoriesByUserId(userId: string): Promise<ChatHistory[]>;
  createChatHistory(history: InsertChatHistory): Promise<ChatHistory | null>;
  updateChatHistory(id: number, history: Partial<InsertChatHistory>): Promise<ChatHistory | null>;
  deleteChatHistory(id: number): Promise<boolean>;
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
    const { data, error } = await supabase
      .from('writing_entries')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) {
      console.error('Error fetching writing entry:', error);
      return null;
    }
    
    return data as WritingEntry;
  }
  
  async getWritingEntriesByUserId(userId: string): Promise<WritingEntry[]> {
    const { data, error } = await supabase
      .from('writing_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching writing entries:', error);
      return [];
    }
    
    return data as WritingEntry[] || [];
  }
  
  async createWritingEntry(entry: InsertWritingEntry): Promise<WritingEntry | null> {
    const { data, error } = await supabase
      .from('writing_entries')
      .insert(entry)
      .select()
      .single();
      
    if (error || !data) {
      console.error('Error creating writing entry:', error);
      return null;
    }
    
    return data as WritingEntry;
  }
  
  async updateWritingEntry(id: number, entry: Partial<InsertWritingEntry>): Promise<WritingEntry | null> {
    const { data, error } = await supabase
      .from('writing_entries')
      .update({
        ...entry,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error || !data) {
      console.error('Error updating writing entry:', error);
      return null;
    }
    
    return data as WritingEntry;
  }
  
  async deleteWritingEntry(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('writing_entries')
      .delete()
      .eq('id', id);
      
    return !error;
  }
  
  // Chat history operations
  async getChatHistory(id: number): Promise<ChatHistory | null> {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error || !data) {
      console.error('Error fetching chat history:', error);
      return null;
    }
    
    return data as ChatHistory;
  }
  
  async getChatHistoriesByUserId(userId: string): Promise<ChatHistory[]> {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching chat histories:', error);
      return [];
    }
    
    return data as ChatHistory[] || [];
  }
  
  async createChatHistory(history: InsertChatHistory): Promise<ChatHistory | null> {
    const { data, error } = await supabase
      .from('chat_history')
      .insert(history)
      .select()
      .single();
      
    if (error || !data) {
      console.error('Error creating chat history:', error);
      return null;
    }
    
    return data as ChatHistory;
  }
  
  async updateChatHistory(id: number, history: Partial<InsertChatHistory>): Promise<ChatHistory | null> {
    const { data, error } = await supabase
      .from('chat_history')
      .update({
        ...history,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error || !data) {
      console.error('Error updating chat history:', error);
      return null;
    }
    
    return data as ChatHistory;
  }
  
  async deleteChatHistory(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('id', id);
      
    return !error;
  }
}

// In-memory mock storage implementation for testing without Supabase
export class MemStorage implements IStorage {
  private writingEntries: Map<number, WritingEntry>;
  private chatHistories: Map<number, ChatHistory>;
  private currentUser: SupabaseUser | null;
  private entryIdCounter: number;
  private historyIdCounter: number;

  constructor() {
    this.writingEntries = new Map();
    this.chatHistories = new Map();
    this.currentUser = null;
    this.entryIdCounter = 1;
    this.historyIdCounter = 1;
  }

  // Authentication operations
  async getCurrentUser(): Promise<SupabaseUser | null> {
    return this.currentUser;
  }

  async signUp(email: string, password: string): Promise<SupabaseUser | null> {
    this.currentUser = {
      id: `user-${Date.now()}`,
      email,
      user_metadata: {
        full_name: email.split('@')[0]
      }
    };
    return this.currentUser;
  }

  async signIn(email: string, password: string): Promise<SupabaseUser | null> {
    // For testing, simply create a user on sign in
    return this.signUp(email, password);
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
  }
  
  // Writing entry operations
  async getWritingEntry(id: number): Promise<WritingEntry | null> {
    return this.writingEntries.get(id) || null;
  }
  
  async getWritingEntriesByUserId(userId: string): Promise<WritingEntry[]> {
    return Array.from(this.writingEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async createWritingEntry(entry: InsertWritingEntry): Promise<WritingEntry | null> {
    const id = this.entryIdCounter++;
    const now = new Date();
    const newEntry: WritingEntry = {
      id,
      userId: entry.userId,
      inputText: entry.inputText,
      grammarResult: entry.grammarResult !== undefined ? entry.grammarResult : null,
      paraphraseResult: entry.paraphraseResult !== undefined ? entry.paraphraseResult : null,
      aiCheckResult: entry.aiCheckResult !== undefined ? entry.aiCheckResult : null,
      humanizerResult: entry.humanizerResult !== undefined ? entry.humanizerResult : null,
      createdAt: now,
      updatedAt: now,
    };
    this.writingEntries.set(id, newEntry);
    return newEntry;
  }
  
  async updateWritingEntry(id: number, entry: Partial<InsertWritingEntry>): Promise<WritingEntry | null> {
    const existingEntry = this.writingEntries.get(id);
    if (!existingEntry) return null;
    
    const updatedEntry: WritingEntry = {
      ...existingEntry,
      inputText: entry.inputText !== undefined ? entry.inputText : existingEntry.inputText,
      grammarResult: entry.grammarResult !== undefined ? entry.grammarResult : existingEntry.grammarResult,
      paraphraseResult: entry.paraphraseResult !== undefined ? entry.paraphraseResult : existingEntry.paraphraseResult,
      aiCheckResult: entry.aiCheckResult !== undefined ? entry.aiCheckResult : existingEntry.aiCheckResult,
      humanizerResult: entry.humanizerResult !== undefined ? entry.humanizerResult : existingEntry.humanizerResult,
      updatedAt: new Date(),
    };
    this.writingEntries.set(id, updatedEntry);
    return updatedEntry;
  }
  
  async deleteWritingEntry(id: number): Promise<boolean> {
    return this.writingEntries.delete(id);
  }
  
  // Chat history operations
  async getChatHistory(id: number): Promise<ChatHistory | null> {
    return this.chatHistories.get(id) || null;
  }
  
  async getChatHistoriesByUserId(userId: string): Promise<ChatHistory[]> {
    return Array.from(this.chatHistories.values())
      .filter(history => history.userId === userId)
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async createChatHistory(history: InsertChatHistory): Promise<ChatHistory | null> {
    const id = this.historyIdCounter++;
    const now = new Date();
    const newHistory: ChatHistory = {
      id,
      userId: history.userId !== undefined ? history.userId : '',
      messages: history.messages,
      createdAt: now,
      updatedAt: now,
    };
    this.chatHistories.set(id, newHistory);
    return newHistory;
  }
  
  async updateChatHistory(id: number, history: Partial<InsertChatHistory>): Promise<ChatHistory | null> {
    const existingHistory = this.chatHistories.get(id);
    if (!existingHistory) return null;
    
    const updatedHistory: ChatHistory = {
      ...existingHistory,
      messages: history.messages !== undefined ? history.messages : existingHistory.messages,
      updatedAt: new Date(),
    };
    this.chatHistories.set(id, updatedHistory);
    return updatedHistory;
  }
  
  async deleteChatHistory(id: number): Promise<boolean> {
    return this.chatHistories.delete(id);
  }
}

// Temporarily use only memory storage until we fix Supabase integration
export const storage = new MemStorage();
