import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { LIMITES, planoDoWorkspace } from "@/lib/planos";

// Leads em CSV no formato de importação de cada CRM. O RLS limita ao workspace do usuário.
// ?formato=rd | pipedrive | hubspot | completo

type Lead = { name: string; role: string; company: string; email: string; phone: string; place: string; status: string; score: number; cnpj: string | null; created_at: string };

const FORMATOS: Record<string, { cabecalho: string[]; linha: (l: Lead) => (string | number)[] }> = {
  rd: {
    cabecalho: ["Nome", "Email", "Telefone", "Cargo", "Empresa", "Cidade", "Etapa", "Score"],
    linha: (l) => [l.name, l.email, l.phone, l.role, l.company, l.place, l.status, l.score],
  },
  pipedrive: {
    cabecalho: ["Person - Name", "Person - Email", "Person - Phone", "Person - Job title", "Organization - Name", "Organization - Address", "Deal - Title", "Deal - Stage"],
    linha: (l) => [l.name, l.email, l.phone, l.role, l.company, l.place, `Oraklo · ${l.company}`, l.status],
  },
  hubspot: {
    cabecalho: ["First Name", "Last Name", "Email", "Phone Number", "Job Title", "Company Name", "City", "Lead Status"],
    linha: (l) => {
      const [primeiro, ...resto] = l.name.split(" ");
      return [primeiro, resto.join(" "), l.email, l.phone, l.role, l.company, l.place.split(",")[0] ?? "", l.status];
    },
  },
  completo: {
    cabecalho: ["Nome", "Cargo", "Empresa", "CNPJ", "E-mail", "Telefone", "Cidade", "Etapa", "Score", "Criado em"],
    linha: (l) => [l.name, l.role, l.company, l.cnpj?.trim() ?? "", l.email, l.phone, l.place, l.status, l.score, new Date(l.created_at).toLocaleDateString("pt-BR")],
  },
};

const celula = (v: string | number) => {
  const s = String(v ?? "");
  // evita fórmulas ao abrir no Excel/Sheets
  const seguro = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const db = await createClient();
  // formatos de CRM (RD, Pipedrive, HubSpot) são do Premium/Ultra; o Free exporta a planilha simples
  const pedido = new URL(req.url).searchParams.get("formato") ?? "completo";
  const formato = LIMITES[await planoDoWorkspace(db, user.workspaceId)].integracoes ? pedido : "completo";
  const f = FORMATOS[formato] ?? FORMATOS.completo;
  const { data, error } = await db.from("leads").select("name, role, company, email, phone, place, status, score, cnpj, created_at").order("created_at", { ascending: false }).limit(10000);
  if (error) return Response.json({ error: "Falha ao exportar" }, { status: 500 });
  // vírgula: é o que os importadores dos CRMs esperam
  const csv = "﻿" + [f.cabecalho, ...(data as Lead[]).map(f.linha)].map((l) => l.map(celula).join(",")).join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="leads-oraklo-${formato}.csv"` },
  });
}
