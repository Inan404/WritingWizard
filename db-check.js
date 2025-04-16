import { db } from './server/db.js';
import { users, writingChats } from './shared/schema.js';

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Check users table
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users in the database`);
    
    // Check writing_chats table
    const allWritingChats = await db.select().from(writingChats);
    console.log(`Found ${allWritingChats.length} writing chats in the database`);
    
    console.log('Database connection is working!');
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
}

checkDatabase();