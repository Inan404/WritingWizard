import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Writing chats table to store chat/writing generate data
export const writingChats = pgTable("writing_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  rawText: text("raw_text").notNull(), // Original writing sample
  prompt: jsonb("prompt").notNull(), // JSON with topic, style, length, etc.
  result: text("result").notNull(), // Generated writing result
  metadata: jsonb("metadata").default({}), // Any additional metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Grammar checks history
export const grammarChecks = pgTable("grammar_checks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  originalText: text("original_text").notNull(),
  correctedText: text("corrected_text"),
  errors: jsonb("errors").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Paraphrasing history
export const paraphrases = pgTable("paraphrases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  originalText: text("original_text").notNull(),
  paraphrasedText: text("paraphrased_text").notNull(),
  style: text("style"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI checks history
export const aiChecks = pgTable("ai_checks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  text: text("text").notNull(),
  aiScore: integer("ai_score").notNull(),
  highlights: jsonb("highlights").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Humanizing history
export const humanizes = pgTable("humanizes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  originalText: text("original_text").notNull(),
  humanizedText: text("humanized_text").notNull(),
  style: text("style"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const userRelations = relations(users, ({ many }) => ({
  writingChats: many(writingChats),
  grammarChecks: many(grammarChecks),
  paraphrases: many(paraphrases),
  aiChecks: many(aiChecks),
  humanizes: many(humanizes),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWritingChatSchema = createInsertSchema(writingChats).omit({
  id: true,
  createdAt: true,
});

export const insertGrammarCheckSchema = createInsertSchema(grammarChecks).omit({
  id: true,
  createdAt: true,
});

export const insertParaphraseSchema = createInsertSchema(paraphrases).omit({
  id: true,
  createdAt: true,
});

export const insertAiCheckSchema = createInsertSchema(aiChecks).omit({
  id: true,
  createdAt: true,
});

export const insertHumanizeSchema = createInsertSchema(humanizes).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWritingChat = z.infer<typeof insertWritingChatSchema>;
export type WritingChat = typeof writingChats.$inferSelect;

export type InsertGrammarCheck = z.infer<typeof insertGrammarCheckSchema>;
export type GrammarCheck = typeof grammarChecks.$inferSelect;

export type InsertParaphrase = z.infer<typeof insertParaphraseSchema>;
export type Paraphrase = typeof paraphrases.$inferSelect;

export type InsertAiCheck = z.infer<typeof insertAiCheckSchema>;
export type AiCheck = typeof aiChecks.$inferSelect;

export type InsertHumanize = z.infer<typeof insertHumanizeSchema>;
export type Humanize = typeof humanizes.$inferSelect;
