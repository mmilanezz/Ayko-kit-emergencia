-- =========================================================
-- AYKO · Kit Emergência — Patch de segurança
-- Restringe técnicos a ver SÓ a própria dupla e o próprio kit,
-- mesmo em consultas diretas (fora da tela, via API).
-- Rode este arquivo no SQL Editor do Supabase.
-- =========================================================

-- DUPLAS: hoje qualquer usuário logado lê todas as duplas.
-- Agora: técnico só lê a própria; admin/suprimentos leem todas.
drop policy if exists "duplas_read_all" on duplas;

create policy "duplas_read_admin_suprimentos" on duplas for select
  using (app_current_role() in ('admin', 'suprimentos'));

create policy "duplas_read_own_tecnico" on duplas for select
  using (app_current_role() = 'tecnico' and id = app_current_dupla());

-- KITS: mesma lógica — técnico só lê o kit vinculado à própria dupla.
drop policy if exists "kits_read_all" on kits;

create policy "kits_read_admin_suprimentos" on kits for select
  using (app_current_role() in ('admin', 'suprimentos'));

create policy "kits_read_own_tecnico" on kits for select
  using (
    app_current_role() = 'tecnico'
    and id = (select kit_id from duplas where id = app_current_dupla())
  );

-- item_tipos continua aberto de propósito (é só o catálogo de nomes de
-- item, ex: "Roteador Mikrotik 750" — não identifica nenhuma dupla).
