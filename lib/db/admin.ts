import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com a service role: ignora o RLS. Só para dados globais (empresas, nichos)
// enquanto não há login (fase 2). Dados de workspace devem usar o cliente do usuário.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no .env.local");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
