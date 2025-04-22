-- Check if 'isfavorite' column exists in 'chat_sessions' table
DO $$
BEGIN
    -- Add 'isfavorite' column to 'chat_sessions' if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'chat_sessions'
        AND column_name = 'isfavorite'
    ) THEN
        ALTER TABLE chat_sessions 
        ADD COLUMN isfavorite BOOLEAN DEFAULT false NOT NULL;
        
        RAISE NOTICE 'Added isfavorite column to chat_sessions table';
    END IF;
    
    -- Add 'isfavorite' column to 'writing_entries' if it doesn't exist
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'writing_entries'
        AND column_name = 'isfavorite'
    ) THEN
        ALTER TABLE writing_entries 
        ADD COLUMN isfavorite BOOLEAN DEFAULT false NOT NULL;
        
        RAISE NOTICE 'Added isfavorite column to writing_entries table';
    END IF;
END
$$;