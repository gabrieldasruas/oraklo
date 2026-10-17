import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";

export type SessionUser = { id: string; email: string; name: string; workspaceId: string; workspaceName: string };

// Verificação de verdade da sessão (o proxy só faz o redirecionamento otimista).
// Memoizada por requisição.
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: member } = await supabase
    .from("members")
    .select("workspace_id, workspaces(name)")
    .eq("user_id", claims.sub)
    .order("created_at")
    .limit(1)
    .maybeSingle<{ workspace_id: string; workspaces: { name: string } | null }>();
  if (!member) return null;

  const meta = (claims.user_metadata ?? {}) as { name?: string };
  const email = String(claims.email ?? "");
  return {
    id: claims.sub,
    email,
    name: meta.name?.trim() || email.split("@")[0],
    workspaceId: member.workspace_id,
    workspaceName: member.workspaces?.name ?? "",
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/entrar");
  return user;
}
