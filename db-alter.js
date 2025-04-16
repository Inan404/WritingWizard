import { pool } from './server/db.js';

async function alterDatabase() {
  try {
    console.log('Starting database alterations...');
    
    // Check if columns already exist
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'writing_chats' 
      AND column_name IN ('grammar_result', 'paraphrase_result', 'ai_check_result', 'humanize_result');
    `;
    
    const { rows } = await pool.query(checkColumnsQuery);
    const existingColumns = rows.map(row => row.column_name);
    
    // Add missing columns
    const alterStatements = [];
    
    if (!existingColumns.includes('grammar_result')) {
      alterStatements.push('ALTER TABLE "writing_chats" ADD COLUMN "grammar_result" text');
    }
    
    if (!existingColumns.includes('paraphrase_result')) {
      alterStatements.push('ALTER TABLE "writing_chats" ADD COLUMN "paraphrase_result" text');
    }
    
    if (!existingColumns.includes('ai_check_result')) {
      alterStatements.push('ALTER TABLE "writing_chats" ADD COLUMN "ai_check_result" text');
    }
    
    if (!existingColumns.includes('humanize_result')) {
      alterStatements.push('ALTER TABLE "writing_chats" ADD COLUMN "humanize_result" text');
    }
    
    // Check for created_at and updated_at columns
    const checkTimeColumns = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'writing_chats' 
      AND column_name IN ('created_at', 'updated_at');
    `;
    
    const timeColumnsResult = await pool.query(checkTimeColumns);
    const existingTimeColumns = timeColumnsResult.rows.map(row => row.column_name);
    
    if (!existingTimeColumns.includes('created_at')) {
      alterStatements.push('ALTER TABLE "writing_chats" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL');
    }
    
    if (!existingTimeColumns.includes('updated_at')) {
      alterStatements.push('ALTER TABLE "writing_chats" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL');
    }
    
    // Execute all alter statements
    if (alterStatements.length > 0) {
      for (const statement of alterStatements) {
        console.log(`Executing: ${statement}`);
        await pool.query(statement);
      }
      console.log('All table alterations completed successfully!');
    } else {
      console.log('No alterations needed. All columns already exist.');
    }
    
  } catch (error) {
    console.error('Error altering database:', error);
  } finally {
    await pool.end();
  }
}

alterDatabase();