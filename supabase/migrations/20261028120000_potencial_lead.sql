-- Potencial do lead: em vez de cortar por capital, idade e porte (que perdiam boas empresas de
-- capital declarado baixo), cada empresa ganha uma faixa A/B/C e a busca mostra as A primeiro.
--   establishments    estabelecimentos ativos da raiz no Brasil (matriz + filiais)
--   rntrc_*           registro na ANTT (só transporte rodoviário de cargas; vem do CSV aberto do RNTRC)
--   potential         A = estrutura (ETC ativo, filiais ou porte DEMAIS) · C = RNTRC pendente · B = o resto
-- Empresário individual (natureza 2135, que inclui o MEI) deixou de ser importado em qualquer nicho.
-- Idempotente: pode ser aplicada direto no banco e de novo pelo `supabase db push`.

alter table public.companies
  add column if not exists establishments smallint,
  add column if not exists rntrc_category text,      -- ETC | TAC | CTC
  add column if not exists rntrc_status text,        -- ATIVO | PENDENTE
  add column if not exists rntrc_equiparado boolean; -- empresa equiparada a autônomo (TAC) pela ANTT

alter table public.companies
  add column if not exists potential char(1) generated always as (
    case
      when rntrc_status is not null and rntrc_status <> 'ATIVO' then 'C'
      when (rntrc_category = 'ETC' and rntrc_status = 'ATIVO' and rntrc_equiparado is not true)
        or coalesce(establishments, 1) >= 2
        or size = 'DEMAIS' then 'A'
      else 'B'
    end
  ) stored;

create index if not exists companies_potential_idx on public.companies (potential);

-- Filtro novo: potentials (ex.: ["A","B"]).
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
    and (
      f->>'q' is null
      or (f->>'q' ~ '^\d+$' and c.cnpj like (f->>'q') || '%')
      or c.trade_name ilike '%' || (f->>'q') || '%'
      or c.legal_name ilike '%' || (f->>'q') || '%'
    );
$$;

-- Resultados por potencial (A primeiro), depois maior capital. Cursor = (potencial, capital, cnpj).
drop function if exists public.search_companies(jsonb, numeric, text, int);
create or replace function public.search_companies(f jsonb, after_potential text default null, after_capital numeric default null, after_cnpj text default null, lim int default 50)
returns setof public.companies
language sql stable
set search_path = ''
as $$
  select c.*
  from public.niche_companies(f) c
  where after_cnpj is null
     or (c.potential, -coalesce(c.share_capital, -1), c.cnpj) > (after_potential, -after_capital, after_cnpj)
  order by c.potential, coalesce(c.share_capital, -1) desc, c.cnpj
  limit least(lim, 100);
$$;

revoke execute on function public.search_companies(jsonb, text, numeric, text, int) from public, anon, authenticated;
grant execute on function public.search_companies(jsonb, text, numeric, text, int) to service_role;
revoke execute on function public.niche_companies(jsonb) from public, anon, authenticated;
grant execute on function public.niche_companies(jsonb) to service_role;

-- Listas na mesma ordem da busca: o corte de 5000 fica com as de maior potencial.
create or replace function public.create_list_from_filter(p_name text, p_filter jsonb, p_niche text default null, p_tag text default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  ws uuid := public.current_workspace();
  new_id uuid;
begin
  if ws is null then raise exception 'Usuário sem workspace'; end if;
  insert into public.lists (workspace_id, name, tag, niche_id, filter, owner_id)
  values (ws, p_name, p_tag, p_niche, p_filter, auth.uid())
  returning id into new_id;
  insert into public.list_items (list_id, cnpj)
  select new_id, c.cnpj
  from public.niche_companies(p_filter) c
  order by c.potential, coalesce(c.share_capital, -1) desc, c.cnpj
  limit 5000;
  return new_id;
end;
$$;

-- Nicho-piloto: sai o corte por capital e idade, fica de fora só quem tem o RNTRC pendente.
update public.niches
set filter = (filter - 'min_share_capital' - 'min_years_open') || '{"potentials": ["A", "B"]}'::jsonb
where id = 'transportadoras-sc';

select public.recompute_niches();
