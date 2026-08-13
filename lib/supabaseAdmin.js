import { createClient } from "@supabase/supabase-js";

// ATENÇÃO: este cliente usa a service role key e tem acesso total ao banco,
// ignorando RLS. NUNCA importe este arquivo em um "use client" component —
// só em rotas de API (app/api/**) ou outro código que roda no servidor.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
