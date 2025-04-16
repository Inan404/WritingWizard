import { pgTable, text, serial, integer, json, timestamp, uuid } from "drizzle-orm/pg-core";
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

// Writing entries table for storing writing data with Supabase
export const writingEntries = pgTable("writing_entries", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"), // UUID from Supabase Auth
  inputText: text("input_text").notNull(),
  grammarResult: text("grammar_result"),
  paraphraseResult: text("paraphrase_result"),
  aiCheckResult: text("ai_check_result"),
  humanizerResult: text("humanizer_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat history for AI conversations
export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"), // UUID from Supabase Auth
  messages: json("messages").notNull(), // Array of chat messages
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema for inserting a new writing entry
export const insertWritingEntrySchema = createInsertSchema(writingEntries)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Schema for inserting chat history
export const insertChatHistorySchema = createInsertSchema(chatHistory)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Export types
export type InsertWritingEntry = z.infer<typeof insertWritingEntrySchema>;
export type WritingEntry = typeof writingEntries.$inferSelect;

export type InsertChatHistory = z.infer<typeof insertChatHistorySchema>;
export type ChatHistory = typeof chatHistory.$inferSelect;

// Interface for chat message
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
