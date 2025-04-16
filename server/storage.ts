import { users, type User, type InsertUser, writingChats, type WritingChat, type InsertWritingChat } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for database operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Writing chat operations
  getWritingChat(id: number): Promise<WritingChat | undefined>;
  getWritingChatsByUserId(userId: number): Promise<WritingChat[]>;
  createWritingChat(chat: InsertWritingChat): Promise<WritingChat>;
  updateWritingChat(id: number, chat: Partial<InsertWritingChat>): Promise<WritingChat | undefined>;
  deleteWritingChat(id: number): Promise<boolean>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Writing chat operations
  async getWritingChat(id: number): Promise<WritingChat | undefined> {
    const [chat] = await db.select().from(writingChats).where(eq(writingChats.id, id));
    return chat || undefined;
  }
  
  async getWritingChatsByUserId(userId: number): Promise<WritingChat[]> {
    return await db
      .select()
      .from(writingChats)
      .where(eq(writingChats.userId, userId))
      .orderBy(writingChats.createdAt);
  }
  
  async createWritingChat(chat: InsertWritingChat): Promise<WritingChat> {
    const [newChat] = await db
      .insert(writingChats)
      .values(chat)
      .returning();
    return newChat;
  }
  
  async updateWritingChat(id: number, chat: Partial<InsertWritingChat>): Promise<WritingChat | undefined> {
    const [updatedChat] = await db
      .update(writingChats)
      .set({
        ...chat,
        updatedAt: new Date()
      })
      .where(eq(writingChats.id, id))
      .returning();
    return updatedChat;
  }
  
  async deleteWritingChat(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(writingChats)
      .where(eq(writingChats.id, id))
      .returning({ id: writingChats.id });
    return !!deleted;
  }
}

// In-memory storage implementation for development/testing
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private writingChats: Map<number, WritingChat>;
  private userIdCounter: number;
  private chatIdCounter: number;

  constructor() {
    this.users = new Map();
    this.writingChats = new Map();
    this.userIdCounter = 1;
    this.chatIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Writing chat operations
  async getWritingChat(id: number): Promise<WritingChat | undefined> {
    return this.writingChats.get(id);
  }
  
  async getWritingChatsByUserId(userId: number): Promise<WritingChat[]> {
    return Array.from(this.writingChats.values())
      .filter(chat => chat.userId === userId)
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async createWritingChat(chat: InsertWritingChat): Promise<WritingChat> {
    const id = this.chatIdCounter++;
    const now = new Date();
    const newChat: WritingChat = {
      id,
      rawText: chat.rawText,
      grammarResult: chat.grammarResult || null,
      paraphraseResult: chat.paraphraseResult || null,
      aiCheckResult: chat.aiCheckResult || null,
      humanizeResult: chat.humanizeResult || null,
      userId: chat.userId || null,
      createdAt: now,
      updatedAt: now,
    };
    this.writingChats.set(id, newChat);
    return newChat;
  }
  
  async updateWritingChat(id: number, chat: Partial<InsertWritingChat>): Promise<WritingChat | undefined> {
    const existingChat = this.writingChats.get(id);
    if (!existingChat) return undefined;
    
    // Create a properly typed updated chat object
    const updatedChat: WritingChat = {
      ...existingChat,
      rawText: chat.rawText !== undefined ? chat.rawText : existingChat.rawText,
      grammarResult: chat.grammarResult !== undefined ? chat.grammarResult : existingChat.grammarResult,
      paraphraseResult: chat.paraphraseResult !== undefined ? chat.paraphraseResult : existingChat.paraphraseResult,
      aiCheckResult: chat.aiCheckResult !== undefined ? chat.aiCheckResult : existingChat.aiCheckResult,
      humanizeResult: chat.humanizeResult !== undefined ? chat.humanizeResult : existingChat.humanizeResult,
      userId: chat.userId !== undefined ? chat.userId : existingChat.userId,
      updatedAt: new Date(),
    };
    this.writingChats.set(id, updatedChat);
    return updatedChat;
  }
  
  async deleteWritingChat(id: number): Promise<boolean> {
    return this.writingChats.delete(id);
  }
}

// Export the appropriate storage implementation based on environment
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
