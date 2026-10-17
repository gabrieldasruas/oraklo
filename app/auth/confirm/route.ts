import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/db/server";

// Destino do link de confirmação de e-mail: troca o código pela sessão e segue para o app.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const nextParam = params.get("next") ?? "/painel";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/painel";
  const supabase = await createClient();

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("Link incompleto") };

  const url = request.nextUrl.clone();
  url.search = "";
  if (error) {
    url.pathname = "/entrar";
    url.searchParams.set("erro", "link");
  } else {
    url.pathname = next.split("?")[0];
  }
  return NextResponse.redirect(url);
}
