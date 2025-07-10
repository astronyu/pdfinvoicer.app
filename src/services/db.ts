// db.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Load from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are missing. Check your .env file.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
