-- Dados por workspace (cliente). Isolamento por RLS: só membros enxergam as linhas do workspace.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'teste',
  monthly_quota int not null default 10000,   -- linhas exportáveis por mês
  created_at timestamptz not null default now()
);

create table public.members (
  workspace_id uuid not null references public.workspaces on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'manager', 'sdr')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index members_user_idx on public.members (user_id);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null check (length(name) between 1 and 120),
  tag text,
  niche_id text references public.niches on delete set null,
  filter jsonb,                                -- filtro usado para criar a lista (nicho ou busca)
  owner_id uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index lists_workspace_idx on public.lists (workspace_id, created_at desc);

create table public.list_items (
  list_id uuid not null references public.lists on delete cascade,
  cnpj char(14) not null references public.companies,
  added_at timestamptz not null default now(),
  primary key (list_id, cnpj)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  cnpj char(14) references public.companies,
  name text not null check (length(name) between 1 and 80),
  role text not null default '',
  company text not null check (length(company) between 1 and 80),
  email text not null default '',
  phone text not null default '',
  place text not null default '',
  status text not null default 'Novo'
    check (status in ('Novo', 'Em sequência', 'Respondeu', 'Reunião marcada', 'Sem interesse')),
  score smallint not null default 0 check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index leads_workspace_idx on public.leads (workspace_id, created_at desc);

create table public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads on delete cascade,
  workspace_id uuid not null references public.workspaces on delete cascade,
  type text not null,                          -- created | status_changed
  payload jsonb not null default '{}',
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index lead_events_lead_idx on public.lead_events (lead_id);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  list_id uuid references public.lists on delete set null,
  rows int not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index exports_workspace_idx on public.exports (workspace_id, created_at);

-- Funções auxiliares ------------------------------------------------------------

-- security definer para não cair em recursão no RLS de members.
create function public.is_member(ws uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.members m where m.workspace_id = ws and m.user_id = (select auth.uid()));
$$;

-- Workspace do usuário logado (por enquanto, um por usuário).
create function public.current_workspace()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select m.workspace_id from public.members m where m.user_id = (select auth.uid()) order by m.created_at limit 1;
$$;

-- Cadastro cria o workspace e torna o usuário admin dele.
create function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare ws uuid;
begin
  insert into public.workspaces (name)
  values (coalesce(nullif(trim(new.raw_user_meta_data->>'company'), ''), split_part(new.email, '@', 1)))
  returning id into ws;
  insert into public.members (workspace_id, user_id, role) values (ws, new.id, 'admin');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cria uma lista com as empresas de um filtro (nicho ou busca). security definer porque
-- clientes não leem companies direto; confere o workspace e limita o tamanho.
create function public.create_list_from_filter(p_name text, p_filter jsonb, p_niche text default null, p_tag text default null)
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
  order by coalesce(c.share_capital, -1) desc, c.cnpj
  limit 5000;
  return new_id;
end;
$$;

-- Registra uma exportação descontando da cota mensal. Falha se a cota não comporta.
create function public.register_export(p_list uuid)
returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  ws uuid;
  total int;
  used int;
  quota int;
begin
  select l.workspace_id into ws from public.lists l where l.id = p_list;
  if ws is null or not public.is_member(ws) then raise exception 'Lista não encontrada'; end if;
  select count(*) into total from public.list_items where list_id = p_list;
  select w.monthly_quota into quota from public.workspaces w where w.id = ws for update;
  select coalesce(sum(e.rows), 0) into used from public.exports e
    where e.workspace_id = ws and e.created_at >= date_trunc('month', now());
  if used + total > quota then
    raise exception 'Cota mensal de exportação insuficiente: % de % linhas já usadas, esta lista tem %', used, quota, total
      using errcode = 'P0001', hint = 'quota_exceeded';
  end if;
  insert into public.exports (workspace_id, list_id, rows, created_by) values (ws, p_list, total, auth.uid());
  return total;
end;
$$;

revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.current_workspace() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_list_from_filter(text, jsonb, text, text) from public, anon;
revoke execute on function public.register_export(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.current_workspace() to authenticated;
grant execute on function public.create_list_from_filter(text, jsonb, text, text) to authenticated;
grant execute on function public.register_export(uuid) to authenticated;

-- RLS ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;
alter table public.exports enable row level security;

create policy "membros leem o workspace" on public.workspaces for select to authenticated
  using (public.is_member(id));
create policy "membros leem os membros" on public.members for select to authenticated
  using (public.is_member(workspace_id));

create policy "membros gerenciam listas" on public.lists for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "membros gerenciam itens" on public.list_items for all to authenticated
  using (exists (select 1 from public.lists l where l.id = list_id and public.is_member(l.workspace_id)))
  with check (exists (select 1 from public.lists l where l.id = list_id and public.is_member(l.workspace_id)));

create policy "membros gerenciam leads" on public.leads for all to authenticated
  using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy "membros leem eventos" on public.lead_events for select to authenticated
  using (public.is_member(workspace_id));
create policy "membros registram eventos" on public.lead_events for insert to authenticated
  with check (public.is_member(workspace_id));

-- Exportações só são criadas por register_export (que confere a cota).
create policy "membros leem exportações" on public.exports for select to authenticated
  using (public.is_member(workspace_id));
