import { pgTable, text, serial, integer, json, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User interface for Supabase Auth User
export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// Local users table for database authentication - matches actual DB structure
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Writing entries table for storing writing data
export const writingEntries = pgTable("writing_entries", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull().references(() => users.id),  // Reference to our users table (lowercase in db)
  title: text("title").default("Untitled"),
  inputText: text("inputtext").notNull(), // lowercase in db
  grammarResult: text("grammarresult"), // lowercase in db
  paraphraseResult: text("paraphraseresult"), // lowercase in db
  aiCheckResult: text("aicheckresult"), // lowercase in db
  humanizerResult: text("humanizeresult"), // lowercase in db
  isFavorite: boolean("isfavorite").default(false), // lowercase in db
  createdAt: timestamp("createdat").defaultNow().notNull(), // lowercase in db
  updatedAt: timestamp("updatedat").defaultNow().notNull(), // lowercase in db
});

// Chat sessions for organizing conversations
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userid").notNull().references(() => users.id), // lowercase in db
  name: text("name").default("New Chat").notNull(),
  isFavorite: boolean("isfavorite").default(false), // lowercase in db
  createdAt: timestamp("createdat").defaultNow().notNull(), // lowercase in db
  updatedAt: timestamp("updatedat").defaultNow().notNull(), // lowercase in db
});

// Individual chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionid").notNull().references(() => chatSessions.id), // lowercase in db
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("createdat").defaultNow().notNull(), // renamed from timestamp to createdat to match DB convention
});

// Schema for inserting a new user
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true });

// Schema for inserting a new writing entry
export const insertWritingEntrySchema = createInsertSchema(writingEntries)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Schema for inserting a new chat session
export const insertChatSessionSchema = createInsertSchema(chatSessions)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Schema for inserting a new chat message
export const insertChatMessageSchema = createInsertSchema(chatMessages)
  .omit({ id: true, timestamp: true });

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WritingEntry = typeof writingEntries.$inferSelect;
export type InsertWritingEntry = z.infer<typeof insertWritingEntrySchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Interface for UI chat message
export interface UIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
