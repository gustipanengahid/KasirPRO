import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("VITE_SUPABASE_URL tidak ditemukan di file .env Anda.");
}

if (!supabaseAnonKey) {
  console.error("VITE_SUPABASE_ANON_KEY tidak ditemukan di file .env Anda.");
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase Environment Variables. Pastikan file .env sudah dikonfigurasi dan server Vite telah direstart.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
