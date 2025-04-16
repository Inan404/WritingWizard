import { createClient } from '@supabase/supabase-js';

// Log environment variables status
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'exists' : 'missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'exists' : 'missing');

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Supabase database
export async function initializeSupabase() {
  try {
    console.log('Initializing Supabase database...');
    
    // Check if we can connect to Supabase
    const { data, error } = await supabase.from('writing_entries').select('id').limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('Table does not exist, please create it manually in the Supabase dashboard');
      console.log(`
CREATE TABLE public.writing_entries (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  input_text TEXT NOT NULL,
  grammar_result TEXT,
  paraphrase_result TEXT,
  ai_check_result TEXT,
  humanizer_result TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX writing_entries_user_id_idx ON public.writing_entries (user_id);

ALTER TABLE public.writing_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own entries"
ON public.writing_entries
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
      `);
    } else if (error) {
      console.error('Error connecting to Supabase:', error);
    } else {
      console.log('Successfully connected to Supabase');
    }
    
    console.log('Supabase initialization complete');
  } catch (error) {
    console.error('Error initializing Supabase:', error);
  }
}