const { pool } = require('./server/db');

async function updateChatSessionsTable() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected to database.');

    try {
      // Check if the column exists first
      const checkColumnQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'chat_sessions' AND column_name = 'isfavorite'
      `;
      const checkResult = await client.query(checkColumnQuery);

      if (checkResult.rows.length === 0) {
        console.log('Column "isfavorite" does not exist. Adding it...');
        // Add the new column
        const alterTableQuery = `
          ALTER TABLE chat_sessions
          ADD COLUMN isfavorite BOOLEAN DEFAULT false
        `;
        await client.query(alterTableQuery);
        console.log('Successfully added "isfavorite" column to chat_sessions table.');
      } else {
        console.log('Column "isfavorite" already exists in chat_sessions table.');
      }
    } finally {
      client.release();
      console.log('Database connection released.');
    }
  } catch (error) {
    console.error('Error updating chat_sessions table:', error);
  }
}

// Execute the function
updateChatSessionsTable().then(() => {
  console.log('Update process complete.');
}).catch(err => {
  console.error('Update process failed:', err);
});