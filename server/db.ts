import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Helper function to check if database tables exist and create them if they don't
export async function ensureTablesExist() {
  try {
    console.log('Checking database tables...');
    
    // Check if users table exists
    const userTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    // If users table doesn't exist, create all tables
    if (!userTableCheck.rows[0].exists) {
      console.log('Creating database tables...');
      
      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT UNIQUE,
          password TEXT NOT NULL,
          full_name TEXT,
          avatar_url TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Create writing_entries table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS writing_entries (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          title TEXT DEFAULT 'Untitled',
          input_text TEXT NOT NULL,
          grammar_result TEXT,
          paraphrase_result TEXT,
          ai_check_result TEXT,
          humanizer_result TEXT,
          is_favorite BOOLEAN DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Create chat_sessions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          name TEXT NOT NULL DEFAULT 'New Chat',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Create chat_messages table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      console.log('Database tables created successfully.');
    } else {
      console.log('Database tables already exist.');
    }
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
  }
}