import fs from 'fs';
import path from 'path';
import { pool } from './server/db.js';

async function migrateDatabase() {
  try {
    console.log('Starting database migration...');
    
    // Read the migration SQL file
    const sqlPath = path.join(process.cwd(), 'migrations', '0000_third_hex.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error migrating database:', error);
  } finally {
    await pool.end();
  }
}

migrateDatabase();