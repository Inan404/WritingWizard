import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function updateUsersTable() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check if email column exists
    const checkEmailColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email';
    `);

    if (checkEmailColumn.rows.length === 0) {
      console.log('Email column does not exist, adding it now...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN email TEXT,
        ADD COLUMN full_name TEXT,
        ADD COLUMN avatar_url TEXT,
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      `);
      console.log('Added email and other missing columns to users table');
    } else {
      console.log('Email column already exists in users table');
    }

    console.log('Database update completed successfully');
  } catch (err) {
    console.error('Error updating database:', err);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

updateUsersTable();