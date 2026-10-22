import "server-only";
import { createAdminClient } from "./db/admin";
import { empresasAbertasDesde, getFacets, type CompanyItem } from "./companies";
import { CNAES_DO_NICHO, PERFIL_TAG, cnaesDoPerfil, completarPerfil, type PerfilBusca } from "./perfil-busca";
import { CONFIG_TAG, completarConfig, type ConfigWorkspace } from "./config-workspace";
import { emailConfigurado, enviarLote, urlDoApp } from "./email";
import { formatMoney, SIZE_LABEL } from "./format";

// Radar de novas empresas: empresas abertas recentemente que combinam com o perfil do usuário.

const DIA = 86_400_000;

/** CNAEs do perfil que existem na base (sem perfil: todos os nichos com dados). */
async function cnaesDoRadar(perfil: PerfilBusca | null) {
  const facets = await getFacets();
  const existentes = new Set(facets.cnaes.map((c) => c.code));
  const base = perfil && perfil.nichos.length ? cnaesDoPerfil(perfil) : Object.values(CNAES_DO_NICHO).flat();
  return { cnaes: [...new Set(base)].filter((c) => existentes.has(c)), ufs: facets.ufs.map((u) => u.code) };
}

export async function radar(perfil: PerfilBusca | null, dias = 180, limite = 12): Promise<{ items: CompanyItem[]; total: number; dias: number }> {
  const { cnaes, ufs } = await cnaesDoRadar(perfil);
  const desde = new Date(Date.now() - dias * DIA).toISOString().slice(0, 10);
  const r = await empresasAbertasDesde({ desde, cnaes, ufs, limite });
  return { ...r, dias };
}

/**
 * Resumo semanal do radar por e-mail (cron das segundas-feiras), para quem deixou
 * "Radar" ligado em Configurações. Precisa do envio de e-mail configurado.
 */
export async function enviarResumoRadar(): Promise<{ enviados: number }> {
  if (!emailConfigurado()) return { enviados: 0 };
  const db = createAdminClient();
  const { data: configs } = await db.from("lists").select("workspace_id, filter").eq("tag", CONFIG_TAG);
  const ativos = (configs ?? []).filter((c) => completarConfig(c.filter as Partial<ConfigWorkspace>).notificar.radar);
  let enviados = 0;
  for (const c of ativos.slice(0, 200)) {
    const ws = c.workspace_id as string;
    const [{ data: perfilRow }, { data: admins }] = await Promise.all([
      db.from("lists").select("filter").eq("workspace_id", ws).eq("tag", PERFIL_TAG).limit(1).maybeSingle(),
      db.from("members").select("user_id").eq("workspace_id", ws).eq("role", "admin").limit(1),
    ]);
    const userId = admins?.[0]?.user_id as string | undefined;
    if (!userId) continue;
    const { data: u } = await db.auth.admin.getUserById(userId);
    const para = u?.user?.email;
    if (!para) continue;
    const perfil = completarPerfil(perfilRow?.filter as Partial<PerfilBusca> | null);
    const r = await radar(perfil, 7, 10).catch(() => null);
    if (!r?.items.length) continue;
    const linhas = r.items.map((e) => `• ${e.name} — ${e.city}/${e.uf} · ${SIZE_LABEL[e.size] ?? "porte não informado"} · capital ${formatMoney(e.shareCapital)}\n  ${urlDoApp()}/empresas/${e.cnpj}`);
    const texto = `Oi! ${r.total} empresa${r.total > 1 ? "s" : ""} do seu perfil abri${r.total > 1 ? "ram" : "u"} nos últimos 7 dias:\n\n${linhas.join("\n\n")}\n\nVeja todas e mande para o pipeline: ${urlDoApp()}/painel\n\n—\nVocê recebe este resumo porque o Radar está ligado. Desligue em ${urlDoApp()}/configuracoes`;
    const [id] = await enviarLote([{ para, assunto: `Radar Oraklo: ${r.total} empresa${r.total > 1 ? "s" : ""} nova${r.total > 1 ? "s" : ""} no seu perfil`, texto }]);
    if (id) enviados++;
  }
  return { enviados };
}
