import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Pool } = pg;

async function migrateFavoriteColumn() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Starting favorite column migration...');
    
    // Read the migration SQL file
    const sqlPath = path.join(process.cwd(), 'migrations', '0001_add_favorite_column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const result = await pool.query(sql);
    console.log('Migration result:', result);
    
    console.log('Favorite column migration completed successfully!');
  } catch (error) {
    console.error('Error migrating favorite column:', error);
  } finally {
    await pool.end();
  }
}

migrateFavoriteColumn();