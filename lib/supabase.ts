// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// имя бакета c фотками
export const BUCKET = process.env.SUPABASE_BUCKET_PHOTOS || 'photos';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
export const STORAGE_PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public`;
