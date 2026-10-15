-- Tabelas globais (base de empresas da Receita). Somente leitura para clientes;
-- quem escreve é o worker, com a service role (que ignora o RLS).

create extension if not exists pg_trgm with schema extensions;

-- Referência ------------------------------------------------------------------

create table public.cnaes (
  code text primary key,            -- 7 dígitos, sem pontuação (ex.: 4930202)
  description text not null
);

-- Códigos de município da própria Receita (não são os do IBGE).
-- A UF não vem no arquivo Municipios; é preenchida a partir dos estabelecimentos.
create table public.municipalities (
  code text primary key,
  name text not null,
  uf char(2)
);

-- Empresas --------------------------------------------------------------------

-- Uma linha por estabelecimento (CNPJ completo de 14 dígitos).
create table public.companies (
  cnpj char(14) primary key,
  cnpj_root char(8) not null,        -- cnpj_basico: liga com sócios e razão social
  legal_name text,
  trade_name text,
  is_headquarters boolean not null,
  status text not null,              -- situação cadastral da Receita ('02' = ativa); 'fora_da_base' se sumiu da importação
  status_since date,
  opened_at date,
  cnae_main text references public.cnaes,
  cnae_secondary text[] not null default '{}',
  uf char(2),
  municipality_code text,
  district text,
  zip text,
  address text,
  size text,                         -- porte: ME | EPP | DEMAIS | NAO_INFORMADO
  share_capital numeric,
  legal_nature text,
  receita_email text,
  receita_phones text[] not null default '{}',
  website text,                      -- preenchidos no enriquecimento (fase 3)
  website_source text,
  fit_score smallint,
  source_period text not null,       -- competência da Receita da última importação (ex.: 2026-10)
  updated_at timestamptz not null default now()
);

create index companies_cnae_uf_idx on public.companies (cnae_main, uf);
create index companies_cnae_secondary_idx on public.companies using gin (cnae_secondary);
create index companies_uf_municipality_idx on public.companies (uf, municipality_code);
create index companies_size_idx on public.companies (size);
create index companies_root_idx on public.companies (cnpj_root);
create index companies_trade_name_trgm_idx on public.companies using gin (trade_name extensions.gin_trgm_ops);
create index companies_legal_name_trgm_idx on public.companies using gin (legal_name extensions.gin_trgm_ops);

-- Sócios (QSA). Sem chave natural estável: a importação substitui os sócios de cada cnpj_root.
-- O CPF vem mascarado da Receita e não é guardado (LGPD).
create table public.partners (
  id bigint generated always as identity primary key,
  cnpj_root char(8) not null,
  name text not null,
  kind text,                         -- PJ | PF | ESTRANGEIRO
  role text,                         -- código de qualificação do sócio
  entered_at date,
  age_range text
);

create index partners_root_idx on public.partners (cnpj_root);

-- Nichos ----------------------------------------------------------------------

-- Nicho = filtro salvo. Substitui `niches` de content/app.ts; as contagens são
-- pré-calculadas por recompute_niches() para os cards não fazerem COUNT a cada visita.
create table public.niches (
  id text primary key,
  group_name text not null,
  name text not null,
  description text,
  icon text,
  region text,
  filter jsonb not null,             -- { cnaes: [...], ufs: [...], sizes: [...], municipalities: [...] }
  roles text[] not null default '{}',
  tags text[] not null default '{}',
  companies_count int,
  contacts_count int,
  avg_score smallint,
  sample_cnpjs text[] not null default '{}',
  refreshed_at timestamptz
);

-- Empresas ativas que casam com o filtro de um nicho.
create function public.niche_companies(f jsonb)
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
      or c.cnae_secondary && array(select jsonb_array_elements_text(f->'cnaes'))
    )
    and (f->'ufs' is null or c.uf = any (array(select jsonb_array_elements_text(f->'ufs'))))
    and (f->'sizes' is null or c.size = any (array(select jsonb_array_elements_text(f->'sizes'))))
    and (f->'municipalities' is null
         or c.municipality_code = any (array(select jsonb_array_elements_text(f->'municipalities'))));
$$;

-- Recalcula as contagens de todos os nichos. Rodar após cada importação/enriquecimento.
create function public.recompute_niches()
returns void
language sql
set search_path = ''
as $$
  update public.niches n
  set companies_count = s.companies_count,
      contacts_count = s.contacts_count,
      avg_score = s.avg_score,
      sample_cnpjs = s.sample_cnpjs,
      refreshed_at = now()
  from public.niches n2
  cross join lateral (
    select
      count(*)::int as companies_count,
      -- até a fase 3 (tabela contacts), conta e-mail e telefones vindos da Receita
      coalesce(sum((c.receita_email is not null)::int + cardinality(c.receita_phones)), 0)::int as contacts_count,
      round(avg(c.fit_score))::smallint as avg_score,
      coalesce(
        (array_agg(c.cnpj::text order by c.fit_score desc nulls last, c.share_capital desc nulls last))[1:3],
        '{}'
      ) as sample_cnpjs
    from public.niche_companies(n2.filter) c
  ) s
  where n.id = n2.id;
$$;

-- RLS: clientes logados só leem. Escrita apenas pela service role.
alter table public.cnaes enable row level security;
alter table public.municipalities enable row level security;
alter table public.companies enable row level security;
alter table public.partners enable row level security;
alter table public.niches enable row level security;

create policy "leitura para usuários logados" on public.cnaes for select to authenticated using (true);
create policy "leitura para usuários logados" on public.municipalities for select to authenticated using (true);
create policy "leitura para usuários logados" on public.companies for select to authenticated using (true);
create policy "leitura para usuários logados" on public.partners for select to authenticated using (true);
create policy "leitura para usuários logados" on public.niches for select to authenticated using (true);

revoke execute on function public.recompute_niches() from public, anon, authenticated;
