import { createClient } from '@supabase/supabase-js';

// Essas variáveis são preenchidas automaticamente ao conectar o Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);