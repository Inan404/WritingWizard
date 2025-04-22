// Add isFavorite column to chat_sessions table
import { pool } from './server/db.js';
// Fallback to direct connection if import fails
if (!pool) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

async function addFavoriteColumn() {
  console.log('Adding isFavorite column to the chat_sessions table...');

  try {
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Check if the column already exists
      const checkColumnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' 
        AND column_name = 'isfavorite';
      `;
      const columnCheckResult = await client.query(checkColumnQuery);
      
      if (columnCheckResult.rows.length === 0) {
        // Add the column if it doesn't exist
        const addColumnQuery = `
          ALTER TABLE chat_sessions 
          ADD COLUMN isfavorite BOOLEAN DEFAULT false NOT NULL;
        `;
        await client.query(addColumnQuery);
        console.log('Successfully added isfavorite column to chat_sessions table');
      } else {
        console.log('isfavorite column already exists in chat_sessions table');
      }
      
      // Also check writing_entries table
      const checkWritingColumnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'writing_entries' 
        AND column_name = 'isfavorite';
      `;
      const writingColumnCheckResult = await client.query(checkWritingColumnQuery);
      
      if (writingColumnCheckResult.rows.length === 0) {
        // Add the column if it doesn't exist
        const addWritingColumnQuery = `
          ALTER TABLE writing_entries 
          ADD COLUMN isfavorite BOOLEAN DEFAULT false NOT NULL;
        `;
        await client.query(addWritingColumnQuery);
        console.log('Successfully added isfavorite column to writing_entries table');
      } else {
        console.log('isfavorite column already exists in writing_entries table');
      }
      
    } finally {
      // Release the client back to the pool
      client.release();
    }
    
    console.log('Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during database migration:', error);
    process.exit(1);
  }
}

addFavoriteColumn();