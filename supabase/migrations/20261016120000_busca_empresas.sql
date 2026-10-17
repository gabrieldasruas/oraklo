-- Busca de empresas: o mesmo filtro dos nichos, com dois critérios a mais:
--   q          texto no nome fantasia/razão social, ou início do CNPJ (só dígitos)
--   has_email  só empresas com e-mail da Receita
-- Assim, uma lista criada a partir de uma busca contém exatamente o que a busca mostrou.

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
    and (
      f->>'q' is null
      or (f->>'q' ~ '^\d+$' and c.cnpj like (f->>'q') || '%')
      or c.trade_name ilike '%' || (f->>'q') || '%'
      or c.legal_name ilike '%' || (f->>'q') || '%'
    );
$$;

-- Página de resultados, do maior para o menor capital social, com cursor (sem OFFSET).
-- O cursor é o par (capital, cnpj) da última linha da página anterior.
create function public.search_companies(f jsonb, after_capital numeric default null, after_cnpj text default null, lim int default 50)
returns setof public.companies
language sql stable
set search_path = ''
as $$
  select c.*
  from public.niche_companies(f) c
  where after_cnpj is null
     or coalesce(c.share_capital, -1) < after_capital
     or (coalesce(c.share_capital, -1) = after_capital and c.cnpj > after_cnpj)
  order by coalesce(c.share_capital, -1) desc, c.cnpj
  limit least(lim, 100);
$$;

create function public.count_companies(f jsonb)
returns bigint
language sql stable
set search_path = ''
as $$
  select count(*) from public.niche_companies(f);
$$;

-- A base de empresas é o produto: clientes não leem direto pela API do Supabase (isso
-- contornaria a cota de exportação). O acesso é só pelo servidor do app, que confere a sessão.
drop policy "leitura para usuários logados" on public.companies;
drop policy "leitura para usuários logados" on public.partners;

revoke execute on function public.niche_companies(jsonb) from public, anon, authenticated;
revoke execute on function public.search_companies(jsonb, numeric, text, int) from public, anon, authenticated;
revoke execute on function public.count_companies(jsonb) from public, anon, authenticated;
grant execute on function public.niche_companies(jsonb) to service_role;
grant execute on function public.search_companies(jsonb, numeric, text, int) to service_role;
grant execute on function public.count_companies(jsonb) to service_role;
