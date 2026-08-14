-- =========================================================
-- AYKO · Kit Emergência — Patch v2
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =========================================================

-- ---------------------------------------------------------
-- 1) PROFILES: campos de gestão de usuário
-- ---------------------------------------------------------
alter table profiles add column if not exists status text not null default 'ativo'
  check (status in ('ativo', 'inativo', 'ferias'));
alter table profiles add column if not exists telefone text;
alter table profiles add column if not exists data_admissao date;

-- ---------------------------------------------------------
-- 2) REPOSICOES: quem solicitou e de qual dupla, direto na tabela
--    (facilita o Suprimentos ver "quem pediu" sem consulta complexa)
-- ---------------------------------------------------------
alter table reposicoes add column if not exists solicitado_por uuid references profiles(id);
alter table reposicoes add column if not exists dupla_id uuid references duplas(id);

-- ---------------------------------------------------------
-- 3) Nome da dupla = junção dos nomes dos técnicos vinculados
-- ---------------------------------------------------------
create or replace function public.atualizar_nome_dupla() returns trigger as $$
declare
  v_dupla_alvo uuid;
  v_dupla_antiga uuid;
  v_novo_nome text;
begin
  if TG_OP = 'DELETE' then
    v_dupla_alvo := old.dupla_id;
  else
    v_dupla_alvo := new.dupla_id;
    if TG_OP = 'UPDATE' and old.dupla_id is distinct from new.dupla_id then
      v_dupla_antiga := old.dupla_id;
    end if;
  end if;

  if v_dupla_alvo is not null then
    select string_agg(nome, ' / ' order by nome) into v_novo_nome
    from profiles where dupla_id = v_dupla_alvo and role = 'tecnico';
    if v_novo_nome is not null then
      update duplas set nome = v_novo_nome where id = v_dupla_alvo;
    end if;
  end if;

  if v_dupla_antiga is not null then
    select string_agg(nome, ' / ' order by nome) into v_novo_nome
    from profiles where dupla_id = v_dupla_antiga and role = 'tecnico';
    update duplas set nome = coalesce(v_novo_nome, nome) where id = v_dupla_antiga;
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_dupla_ins on profiles;
create trigger trg_dupla_ins after insert on profiles
  for each row when (new.role = 'tecnico')
  execute function public.atualizar_nome_dupla();

drop trigger if exists trg_dupla_upd on profiles;
create trigger trg_dupla_upd after update of dupla_id on profiles
  for each row when (new.role = 'tecnico')
  execute function public.atualizar_nome_dupla();

drop trigger if exists trg_dupla_del on profiles;
create trigger trg_dupla_del after delete on profiles
  for each row when (old.role = 'tecnico')
  execute function public.atualizar_nome_dupla();

-- ---------------------------------------------------------
-- 4) Nome do kit = "Kit - <nome da dupla>" quando vinculado
-- ---------------------------------------------------------
create or replace function public.atualizar_nome_kit() returns trigger as $$
begin
  if new.kit_id is not null then
    update kits set nome = 'Kit - ' || new.nome where id = new.kit_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_atualizar_nome_kit on duplas;
create trigger trg_atualizar_nome_kit
  after insert or update of nome, kit_id on duplas
  for each row execute function public.atualizar_nome_kit();

-- ---------------------------------------------------------
-- 5) gerar_reposicao(): agora também grava quem solicitou e a dupla
-- ---------------------------------------------------------
create or replace function public.gerar_reposicao() returns trigger as $$
declare
  v_kit_id uuid;
  v_dupla_id uuid;
  v_conferido_por uuid;
begin
  if new.status in ('faltando', 'danificado') then
    select kit_id, dupla_id, conferido_por into v_kit_id, v_dupla_id, v_conferido_por
    from conferencias where id = new.conferencia_id;

    insert into reposicoes (conferencia_item_id, kit_id, item_tipo_id, solicitado_por, dupla_id)
    select new.id, v_kit_id, i.item_tipo_id, v_conferido_por, v_dupla_id
    from kit_item_instancias i
    where i.id = new.instancia_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------
-- 6) USOS EM CAMPO: técnico registra uso de item durante atendimento,
--    já vinculando o número do chamado no Halo
-- ---------------------------------------------------------
create table if not exists usos_campo (
  id uuid primary key default gen_random_uuid(),
  instancia_id uuid not null references kit_item_instancias(id),
  tecnico_id uuid not null references profiles(id),
  dupla_id uuid not null references duplas(id),
  chamado_halo_id text not null,
  observacao text,
  created_at timestamptz not null default now()
);

alter table usos_campo enable row level security;

drop policy if exists "usos_campo_insert_tecnico" on usos_campo;
create policy "usos_campo_insert_tecnico" on usos_campo for insert
  with check (app_current_role() = 'tecnico' and dupla_id = app_current_dupla());

drop policy if exists "usos_campo_select_tecnico" on usos_campo;
create policy "usos_campo_select_tecnico" on usos_campo for select
  using (app_current_role() = 'tecnico' and dupla_id = app_current_dupla());

drop policy if exists "usos_campo_select_admin_suprimentos" on usos_campo;
create policy "usos_campo_select_admin_suprimentos" on usos_campo for select
  using (app_current_role() in ('admin', 'suprimentos'));

create or replace function public.registrar_uso_campo() returns trigger as $$
declare
  v_kit_id uuid;
  v_item_tipo_id uuid;
begin
  select kit_id, item_tipo_id into v_kit_id, v_item_tipo_id
  from kit_item_instancias where id = new.instancia_id;

  update kit_item_instancias set status = 'faltando', updated_at = now()
  where id = new.instancia_id;

  insert into reposicoes (kit_id, item_tipo_id, chamado_halo_id, solicitado_por, dupla_id)
  values (v_kit_id, v_item_tipo_id, new.chamado_halo_id, new.tecnico_id, new.dupla_id);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_registrar_uso_campo on usos_campo;
create trigger trg_registrar_uso_campo
  after insert on usos_campo
  for each row execute function public.registrar_uso_campo();
