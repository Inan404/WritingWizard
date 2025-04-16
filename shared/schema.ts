import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table - keeping the basic structure from the original
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Writing chats table for storing writing data
export const writingChats = pgTable("writing_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  rawText: text("raw_text").notNull(),
  grammarResult: text("grammar_result"),
  paraphraseResult: text("paraphrase_result"),
  aiCheckResult: text("ai_check_result"),
  humanizeResult: text("humanize_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema for inserting a new Writing chat
export const insertWritingChatSchema = createInsertSchema(writingChats)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWritingChat = z.infer<typeof insertWritingChatSchema>;
export type WritingChat = typeof writingChats.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
