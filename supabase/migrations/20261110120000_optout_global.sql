-- Opt-out global (LGPD): quem pede para sair deixa de ser contatado por TODOS os workspaces.
-- Só o servidor (service role) lê e grava estas tabelas: RLS ligado e nenhuma policy.
-- Idempotente: pode rodar de novo sem efeito.

-- kind/value:
--   email → sha256 (hex) do e-mail em minúsculas e sem espaços (não guardamos o e-mail em claro)
--   cnpj  → os 14 dígitos (a empresa some da busca, das listas e do pipeline)
--   socio → sha256 de "<cnpj_root>|<NOME NORMALIZADO>" (o nome some da ficha e dos decisores)
create table if not exists public.suppressions (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('email', 'cnpj', 'socio')),
  value text not null,
  reason text not null check (reason in ('descadastro', 'pedido_publico', 'manual')),
  evidence jsonb not null default '{}',  -- prova do pedido (lead/workspace do link, id do pedido público)
  created_at timestamptz not null default now(),
  unique (kind, value)
);
create index if not exists suppressions_value_idx on public.suppressions (value);
alter table public.suppressions enable row level security;

-- Pedidos feitos na página pública /remover-dados. Viram supressão quando o dono do e-mail confirma.
-- É também o registro de quando e como cada pedido foi atendido (prova para a ANPD).
create table if not exists public.suppression_requests (
  id uuid primary key default gen_random_uuid(),
  requester_hash text not null,  -- sha256 do e-mail de quem pediu
  kind text not null check (kind in ('email', 'cnpj', 'socio')),
  value text not null,           -- mesmo formato de suppressions.value
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists suppression_requests_requester_idx on public.suppression_requests (requester_hash, created_at desc);
create index if not exists suppression_requests_created_idx on public.suppression_requests (created_at desc);
alter table public.suppression_requests enable row level security;

revoke all on public.suppressions, public.suppression_requests from anon, authenticated;

-- Busca, contagem e listas: CNPJ removido não aparece mais.
create or replace function public.niche_companies(f jsonb)
returns setof public.companies
language sql stable
set search_path = ''
as $$
  select c.*
  from public.companies c
  where c.status = '02'
    and (
      f->'cnaes' is null
      or c.cnae_main = any (array(select jsonb_array_elements_text(f->'cnaes')))
      or (coalesce((f->>'cnae_main_only')::boolean, false) = false
          and c.cnae_secondary && array(select jsonb_array_elements_text(f->'cnaes')))
    )
    and (f->'ufs' is null or c.uf = any (array(select jsonb_array_elements_text(f->'ufs'))))
    and (f->'sizes' is null or c.size = any (array(select jsonb_array_elements_text(f->'sizes'))))
    and (f->'municipalities' is null
         or c.municipality_code = any (array(select jsonb_array_elements_text(f->'municipalities'))))
    and (f->'exclude_legal_natures' is null
         or c.legal_nature is null
         or c.legal_nature <> all (array(select jsonb_array_elements_text(f->'exclude_legal_natures'))))
    and (f->'min_share_capital' is null or c.share_capital >= (f->>'min_share_capital')::numeric)
    and (f->'min_years_open' is null
         or c.opened_at <= current_date - make_interval(years => (f->>'min_years_open')::int))
    and (coalesce((f->>'headquarters_only')::boolean, false) = false or c.is_headquarters)
    and (coalesce((f->>'has_email')::boolean, false) = false or c.receita_email is not null)
    and (f->'potentials' is null or c.potential = any (array(select jsonb_array_elements_text(f->'potentials'))))
    and (coalesce((f->>'no_own_site')::boolean, false) = false
         or (c.website is null and public.email_without_own_site(c.receita_email, c.legal_name)))
    and (
      f->>'q' is null
      or (f->>'q' ~ '^\d+$' and c.cnpj like (f->>'q') || '%')
      or c.trade_name ilike '%' || (f->>'q') || '%'
      or c.legal_name ilike '%' || (f->>'q') || '%'
    )
    and not exists (select 1 from public.suppressions s where s.kind = 'cnpj' and s.value = c.cnpj::text);
$$;

revoke execute on function public.niche_companies(jsonb) from public, anon, authenticated;
grant execute on function public.niche_companies(jsonb) to service_role;
