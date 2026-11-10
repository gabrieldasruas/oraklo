-- Regime tributário vindo da BrasilAPI (que repassa o Minha Receita), consultado só quando alguém
-- abre a ficha da empresa. Cache por CNPJ: só consulta de novo depois de 30 dias.
-- Só o servidor lê e grava (RLS ligado, nenhuma policy). Idempotente.

create table if not exists public.company_tax_info (
  cnpj char(14) primary key,
  regime text,             -- "SIMPLES NACIONAL", "MEI" ou a forma_de_tributacao do último ano (LUCRO REAL, LUCRO PRESUMIDO…)
  regime_year smallint,    -- ano da forma de tributação (nulo para Simples/MEI)
  fetched_at timestamptz not null default now()
);
alter table public.company_tax_info enable row level security;
revoke all on public.company_tax_info from anon, authenticated;
