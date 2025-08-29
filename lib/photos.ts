import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const BUCKET = process.env.SUPABASE_BUCKET_PHOTOS || 'photos';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
