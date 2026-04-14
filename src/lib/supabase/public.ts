import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase sans session — utilisé uniquement pour les pages publiques
 * (mini-site agence). Ne lit pas les cookies, opère en tant que rôle `anon`.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
