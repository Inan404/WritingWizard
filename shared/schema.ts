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

// Local users table for database authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Writing entries table for storing writing data
export const writingEntries = pgTable("writing_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),  // Reference to our users table
  title: text("title").default("Untitled"),
  inputText: text("input_text").notNull(),
  grammarResult: text("grammar_result"),
  paraphraseResult: text("paraphrase_result"),
  aiCheckResult: text("ai_check_result"),
  humanizerResult: text("humanizer_result"),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat sessions for organizing conversations
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").default("New Chat").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => chatSessions.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Schema for inserting a new user
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true });

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
