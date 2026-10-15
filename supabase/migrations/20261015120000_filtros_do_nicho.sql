-- Critérios extras no filtro do nicho, para cortar quem não é cliente-alvo:
--   cnae_main_only          só empresas cujo CNAE principal está em `cnaes` (ignora o secundário)
--   exclude_legal_natures   naturezas jurídicas fora do nicho (ex.: 2135 = empresário individual/MEI)
--   min_share_capital       capital social mínimo, em reais
--   min_years_open          idade mínima da empresa, em anos
--   headquarters_only       só matrizes (filiais viram leads duplicados)
-- O import da Receita só usa cnaes, ufs, municipalities e cnae_main_only; o resto é aplicado aqui,
-- para a busca poder afrouxar esses critérios sobre a mesma base.

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
    and (coalesce((f->>'headquarters_only')::boolean, false) = false or c.is_headquarters);
$$;

update public.niches
set filter = filter || '{
  "cnae_main_only": true,
  "exclude_legal_natures": ["2135"],
  "min_share_capital": 100000,
  "min_years_open": 2,
  "headquarters_only": true
}'::jsonb
where id = 'transportadoras-sc';

select public.recompute_niches();
