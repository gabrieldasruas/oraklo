-- Opções dos filtros da busca: só valores que existem na base (empresas ativas), com contagem.
create function public.company_facets()
returns jsonb
language sql stable
set search_path = ''
as $$
  select jsonb_build_object(
    'cnaes', (
      select coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'description', x.description, 'count', x.n) order by x.n desc), '[]')
      from (
        select c.cnae_main as code, k.description, count(*) as n
        from public.companies c join public.cnaes k on k.code = c.cnae_main
        where c.status = '02'
        group by c.cnae_main, k.description
      ) x
    ),
    'ufs', (
      select coalesce(jsonb_agg(jsonb_build_object('code', x.uf, 'count', x.n) order by x.uf), '[]')
      from (select c.uf, count(*) as n from public.companies c where c.status = '02' group by c.uf) x
    ),
    'municipalities', (
      select coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'name', x.name, 'uf', x.uf, 'count', x.n) order by x.name), '[]')
      from (
        select c.municipality_code as code, m.name, c.uf, count(*) as n
        from public.companies c join public.municipalities m on m.code = c.municipality_code
        where c.status = '02'
        group by c.municipality_code, m.name, c.uf
      ) x
    )
  );
$$;

revoke execute on function public.company_facets() from public, anon, authenticated;
grant execute on function public.company_facets() to service_role;
