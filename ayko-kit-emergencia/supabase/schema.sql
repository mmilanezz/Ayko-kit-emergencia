-- =========================================================
-- AYKO · Kit Emergência — Schema Supabase/PostgreSQL
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------

create table kits (
  id uuid primary key default gen_random_uuid(),
  nome text not null,               -- "Kit Emergência 01"
  created_at timestamptz not null default now()
);

create table duplas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,               -- "Dupla 1 - Alessandro / Anthony"
  kit_id uuid references kits(id) on delete set null,
  created_at timestamptz not null default now()
);

-- profiles espelha auth.users, guarda papel e vínculo com a dupla
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null check (role in ('tecnico','suprimentos','admin')),
  dupla_id uuid references duplas(id) on delete set null,
  created_at timestamptz not null default now()
);

-- catálogo de tipos de item que compõem o kit padrão
create table item_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                          -- "Roteador Mikrotik 750"
  quantidade_padrao int not null default 1,
  requer_identificacao boolean not null default true,  -- patrimônio/nº série
  created_at timestamptz not null default now()
);

-- cada unidade física de um item, dentro de um kit específico
create table kit_item_instancias (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits(id) on delete cascade,
  item_tipo_id uuid not null references item_tipos(id) on delete restrict,
  identificacao text,                 -- número de patrimônio/série, se houver
  status text not null default 'ok' check (status in ('ok','faltando','danificado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- uma conferência = um evento de handoff (recebimento ou devolução)
create table conferencias (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits(id),
  dupla_id uuid not null references duplas(id),
  conferido_por uuid not null references profiles(id),
  tipo text not null check (tipo in ('recebimento','devolucao')),
  observacoes text,
  created_at timestamptz not null default now()
);

-- item a item, o que foi encontrado na conferência
create table conferencia_itens (
  id uuid primary key default gen_random_uuid(),
  conferencia_id uuid not null references conferencias(id) on delete cascade,
  instancia_id uuid not null references kit_item_instancias(id),
  status text not null check (status in ('ok','faltando','danificado')),
  identificacao_confirmada text,
  observacao text
);

-- reposição pendente, gerada automaticamente quando falta/quebra item
create table reposicoes (
  id uuid primary key default gen_random_uuid(),
  conferencia_item_id uuid references conferencia_itens(id),
  kit_id uuid not null references kits(id),
  item_tipo_id uuid not null references item_tipos(id),
  status text not null default 'pendente' check (status in ('pendente','atendida')),
  chamado_halo_id text,
  created_at timestamptz not null default now(),
  atendida_at timestamptz,
  atendida_por uuid references profiles(id)
);

-- ---------------------------------------------------------
-- TRIGGER: gera reposição automática quando um item da
-- conferência entra como 'faltando' ou 'danificado'
-- ---------------------------------------------------------

create or replace function public.gerar_reposicao() returns trigger as $$
declare
  v_kit_id uuid;
begin
  if new.status in ('faltando','danificado') then
    select kit_id into v_kit_id from conferencias where id = new.conferencia_id;
    insert into reposicoes (conferencia_item_id, kit_id, item_tipo_id)
    select new.id, v_kit_id, i.item_tipo_id
    from kit_item_instancias i
    where i.id = new.instancia_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_gerar_reposicao
  after insert on conferencia_itens
  for each row execute function public.gerar_reposicao();

-- ---------------------------------------------------------
-- TRIGGER: cria automaticamente um profile (role padrão 'tecnico')
-- toda vez que você criar um usuário no Authentication do Supabase.
-- Depois é só o admin ajustar papel/dupla na tela "Duplas & Usuários".
-- ---------------------------------------------------------

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'tecnico'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- HELPERS de papel/dupla (usados nas policies de RLS)
-- ---------------------------------------------------------

create or replace function public.current_role() returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.current_dupla() returns uuid as $$
  select dupla_id from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------

alter table kits enable row level security;
alter table duplas enable row level security;
alter table profiles enable row level security;
alter table item_tipos enable row level security;
alter table kit_item_instancias enable row level security;
alter table conferencias enable row level security;
alter table conferencia_itens enable row level security;
alter table reposicoes enable row level security;

-- profiles: cada um vê o próprio; admin vê todos
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or current_role() = 'admin');
create policy "profiles_admin_write" on profiles for all
  using (current_role() = 'admin') with check (current_role() = 'admin');

-- kits, duplas, item_tipos: admin CRUD completo; demais papéis leem tudo
create policy "kits_read_all" on kits for select using (true);
create policy "kits_admin_write" on kits for insert with check (current_role() = 'admin');
create policy "kits_admin_update" on kits for update using (current_role() = 'admin');
create policy "kits_admin_delete" on kits for delete using (current_role() = 'admin');

create policy "duplas_read_all" on duplas for select using (true);
create policy "duplas_admin_write" on duplas for insert with check (current_role() = 'admin');
create policy "duplas_admin_update" on duplas for update using (current_role() = 'admin');
create policy "duplas_admin_delete" on duplas for delete using (current_role() = 'admin');

create policy "item_tipos_read_all" on item_tipos for select using (true);
create policy "item_tipos_admin_write" on item_tipos for insert with check (current_role() = 'admin');
create policy "item_tipos_admin_update" on item_tipos for update using (current_role() = 'admin');
create policy "item_tipos_admin_delete" on item_tipos for delete using (current_role() = 'admin');

-- kit_item_instancias: admin CRUD total; técnico só lê/atualiza status do kit da própria dupla; suprimentos lê tudo
create policy "instancias_admin_all" on kit_item_instancias for all
  using (current_role() = 'admin') with check (current_role() = 'admin');
create policy "instancias_read_suprimentos" on kit_item_instancias for select
  using (current_role() = 'suprimentos');
create policy "instancias_read_tecnico" on kit_item_instancias for select
  using (current_role() = 'tecnico' and kit_id = (select kit_id from duplas where id = current_dupla()));
create policy "instancias_update_tecnico" on kit_item_instancias for update
  using (current_role() = 'tecnico' and kit_id = (select kit_id from duplas where id = current_dupla()));

-- conferencias: técnico cria/lê as da própria dupla; admin e suprimentos leem todas
create policy "conferencias_insert_tecnico" on conferencias for insert
  with check (current_role() = 'tecnico' and dupla_id = current_dupla());
create policy "conferencias_select_tecnico" on conferencias for select
  using (current_role() = 'tecnico' and dupla_id = current_dupla());
create policy "conferencias_select_admin_suprimentos" on conferencias for select
  using (current_role() in ('admin','suprimentos'));

-- conferencia_itens: segue a mesma regra da conferência-pai
create policy "conferencia_itens_insert_tecnico" on conferencia_itens for insert
  with check (
    exists (
      select 1 from conferencias c
      where c.id = conferencia_id
        and current_role() = 'tecnico'
        and c.dupla_id = current_dupla()
    )
  );
create policy "conferencia_itens_select_tecnico" on conferencia_itens for select
  using (
    exists (
      select 1 from conferencias c
      where c.id = conferencia_id
        and current_role() = 'tecnico'
        and c.dupla_id = current_dupla()
    )
  );
create policy "conferencia_itens_select_admin_suprimentos" on conferencia_itens for select
  using (current_role() in ('admin','suprimentos'));

-- reposicoes: admin e suprimentos leem/atualizam; suprimentos marca como atendida
create policy "reposicoes_select_admin_suprimentos" on reposicoes for select
  using (current_role() in ('admin','suprimentos'));
create policy "reposicoes_update_admin_suprimentos" on reposicoes for update
  using (current_role() in ('admin','suprimentos'));

-- ---------------------------------------------------------
-- SEED: catálogo padrão do kit emergência (sua listagem)
-- ---------------------------------------------------------

insert into item_tipos (nome, quantidade_padrao, requer_identificacao) values
  ('Roteador Mikrotik 750', 1, true),
  ('Roteador Mikrotik 760', 1, true),
  ('Conversor de Mídia (CMI) Fast - par', 2, true),
  ('Conversor de Mídia (CMI) Giga - par', 2, true),
  ('ONU Datacom', 2, true),
  ('ONU Cianet', 1, true),
  ('SFP 1310/1550 1Gb - par', 2, true),
  ('Caixa de emenda', 4, true);

-- SEED: 8 kits + 8 duplas (renomeie depois pelos nomes reais das duplas)
do $$
declare
  i int;
  v_kit_id uuid;
begin
  for i in 1..8 loop
    insert into kits (nome) values ('Kit Emergência 0' || i) returning id into v_kit_id;
    insert into duplas (nome, kit_id) values ('Dupla ' || i, v_kit_id);

    -- popula as instâncias físicas de cada tipo de item dentro do kit
    insert into kit_item_instancias (kit_id, item_tipo_id, status)
    select v_kit_id, t.id, 'ok'
    from item_tipos t, generate_series(1, t.quantidade_padrao);
  end loop;
end $$;
