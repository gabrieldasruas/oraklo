"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";

// `email` volta para o formulário: o React limpa os campos depois de cada envio.
export type AuthState = { error?: string; info?: string; email?: string };

// Só caminhos internos: evita redirecionamento aberto via ?next=
function safeNext(value: FormDataEntryValue | null) {
  const v = String(value ?? "");
  return v.startsWith("/") && !v.startsWith("//") ? v : "/painel";
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. O link foi enviado no cadastro.",
  user_already_exists: "Já existe uma conta com esse e-mail. Entre com sua senha.",
  weak_password: "A senha precisa ter pelo menos 8 caracteres.",
  over_email_send_rate_limit: "Muitos e-mails enviados agora. Tente de novo em alguns minutos.",
};
const message = (code: string | undefined, fallback: string) => (code && MESSAGES[code]) || fallback;

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error) return { error: message(error.code, "Não foi possível entrar. Tente de novo."), email };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  const email = String(form.get("email") ?? "").trim();
  if (password.length < 8) return { error: MESSAGES.weak_password, email };

  const origin = (await headers()).get("origin") ?? "";
  const next = safeNext(form.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: String(form.get("name") ?? "").trim(), company: String(form.get("company") ?? "").trim() },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: message(error.code, "Não foi possível criar a conta. Tente de novo."), email };
  // Com confirmação de e-mail ligada no Supabase, a sessão só existe depois do clique no link.
  if (!data.session) return { info: "Conta criada. Enviamos um link de confirmação para o seu e-mail.", email };
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
