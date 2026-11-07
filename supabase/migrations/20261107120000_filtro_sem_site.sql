-- Filtro "sem site próprio" (no_own_site), enquanto o enriquecimento não preenche companies.website.
-- Aproximação pelo e-mail da Receita: a empresa não tem site próprio se não tem e-mail, se usa webmail
-- (gmail, hotmail…) ou se o domínio é de terceiros, como contador ou provedor de internet.
-- Domínio de terceiros: tem cara de contador (.cnt.br, "contab") ou aparece em 5 ou mais raízes de CNPJ
-- sem estar na razão social da maioria delas. Mesmo assim, o domínio continua sendo site próprio da
-- empresa cujo nome bate com ele: as agregadas de uma transportadora usam o e-mail dela, mas só a
-- transportadora é dona do site.
-- Idempotente: pode ser aplicada direto no banco e de novo pelo `supabase db push`.

create table if not exists public.shared_email_domains (
  domain text primary key,
  roots int not null,
  reason text not null -- 'contador' | 'compartilhado'
);
alter table public.shared_email_domains enable row level security; -- sem policy: só o service role lê

create or replace function public.refresh_shared_email_domains()
returns void
language sql
set search_path = ''
as $$
  delete from public.shared_email_domains;
  insert into public.shared_email_domains (domain, roots, reason)
  select domain, roots,
         case when domain ~ '\.cnt\.br$' or domain ~ 'contab' then 'contador' else 'compartilhado' end
  from (
    select split_part(c.receita_email, '@', 2) as domain,
           count(distinct c.cnpj_root) as roots,
           count(distinct c.cnpj_root) filter (
             where lower(regexp_replace(coalesce(c.legal_name, ''), '[^A-Za-z0-9]', '', 'g'))
                   like '%' || split_part(split_part(c.receita_email, '@', 2), '.', 1) || '%'
           ) as roots_com_nome
    from public.companies c
    where c.receita_email is not null
    group by 1
  ) d
  where d.domain ~ '\.cnt\.br$'
     or d.domain ~ 'contab'
     or (d.roots >= 5 and d.roots_com_nome * 2 < d.roots);
$$;

-- true quando o e-mail não indica site próprio da empresa (sem e-mail, webmail ou domínio de terceiros).
create or replace function public.email_without_own_site(email text, legal_name text)
returns boolean
language sql stable
set search_path = ''
as $$
  select email is null
      or split_part(email, '@', 2) ~ '^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|bol|uol|terra|ig|globo|globomail|icloud|me|aol|zipmail|r7|oi|protonmail)\.'
      or (
        exists (select 1 from public.shared_email_domains s where s.domain = split_part(email, '@', 2))
        and lower(regexp_replace(coalesce(legal_name, ''), '[^A-Za-z0-9]', '', 'g'))
            not like '%' || split_part(split_part(email, '@', 2), '.', 1) || '%'
      );
$$;

revoke execute on function public.refresh_shared_email_domains() from public, anon, authenticated;
revoke execute on function public.email_without_own_site(text, text) from public, anon, authenticated;

-- Filtro novo: no_own_site. Quando o enriquecimento preencher website, ele passa a valer sozinho.
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
    );
$$;

select public.refresh_shared_email_domains();
