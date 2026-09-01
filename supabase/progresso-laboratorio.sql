-- ============================================================================
-- PROGRESSO DO LABORATÓRIO — rode este arquivo no SQL Editor do Supabase.
--
-- É só esta parte: o schema.sql completo já contém tudo isto, mas se o banco
-- já está de pé, colar só este trecho é mais rápido e não mexe em nada além.
-- Pode rodar mais de uma vez sem medo.
-- ============================================================================

-- ============================================================================
-- 9. PROGRESSO DO LABORATÓRIO
--    Antes o progresso ficava só no navegador, e o aluno perdia tudo ao trocar
--    de máquina ou limpar o histórico. Agora fica no banco, preso à ficha dele.
-- ============================================================================

create table if not exists public.lab_progresso (
  perfil_id     uuid primary key references public.perfis(id) on delete cascade,
  feitos        text[] not null default '{}',
  rascunhos     jsonb  not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.lab_progresso enable row level security;

drop policy if exists "lab: vejo o meu"      on public.lab_progresso;
drop policy if exists "lab: crio o meu"      on public.lab_progresso;
drop policy if exists "lab: atualizo o meu"  on public.lab_progresso;
drop policy if exists "lab: chefia acompanha" on public.lab_progresso;

create policy "lab: vejo o meu" on public.lab_progresso
  for select to authenticated
  using (perfil_id = (select auth.uid()));

-- a docente acompanha quem está onde, sem precisar perguntar de mesa em mesa
create policy "lab: chefia acompanha" on public.lab_progresso
  for select to authenticated
  using (public.eh_docente());

create policy "lab: crio o meu" on public.lab_progresso
  for insert to authenticated
  with check (perfil_id = (select auth.uid()) and public.eh_filiado());

create policy "lab: atualizo o meu" on public.lab_progresso
  for update to authenticated
  using      (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));

grant select on public.lab_progresso to authenticated;
grant insert (perfil_id, feitos, rascunhos)               on public.lab_progresso to authenticated;
grant update (feitos, rascunhos, atualizado_em)           on public.lab_progresso to authenticated;
