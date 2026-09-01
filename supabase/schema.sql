-- ============================================================================
-- O SINDICATO DOS DADOS — estrutura do banco
--
-- COMO USAR: abra o painel do Supabase → SQL Editor → New query,
-- cole este arquivo inteiro e clique em RUN. Pode rodar mais de uma vez:
-- o script foi escrito para não quebrar se já tiver sido executado antes.
--
-- ANTES DE RODAR: troque o código da turma na linha marcada com >>> TROQUE <<<
-- ============================================================================


-- ============================================================================
-- 1. AS TABELAS
-- ============================================================================

-- Ficha de cada agente. Nasce junto com o usuário, mas só vale depois
-- que o aluno digita o código da turma (filiado = true).
create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default 'Agente sem nome'
              check (char_length(btrim(nome)) between 2 and 80),
  github      text check (github is null or github ~ '^[A-Za-z0-9-]{1,39}$'),
  celula      text not null default 'Alfa' check (char_length(celula) <= 30),
  papel       text not null default 'aluno' check (papel in ('aluno','docente')),
  avatar_url  text,
  filiado     boolean not null default false,
  tentativas  smallint not null default 0,
  criado_em   timestamptz not null default now()
);

-- Cada pergunta, material ou aviso do fórum.
create table if not exists public.topicos (
  id          bigint generated always as identity primary key,
  autor_id    uuid not null references public.perfis(id) on delete cascade,
  titulo      text not null check (char_length(btrim(titulo)) between 3 and 140),
  corpo       text not null check (char_length(btrim(corpo)) between 1 and 8000),
  categoria   text not null default 'duvida'
              check (categoria in ('duvida','material','vitoria','aviso','entrega')),
  missao      smallint check (missao is null or missao between 1 and 27),
  imagem_url  text,
  fixado      boolean not null default false,
  resolvido   boolean not null default false,
  criado_em   timestamptz not null default now(),
  editado_em  timestamptz
);

create index if not exists topicos_ordem     on public.topicos (fixado desc, criado_em desc);
create index if not exists topicos_categoria on public.topicos (categoria);
create index if not exists topicos_autor     on public.topicos (autor_id);

-- As respostas de cada tópico.
create table if not exists public.respostas (
  id          bigint generated always as identity primary key,
  topico_id   bigint not null references public.topicos(id) on delete cascade,
  autor_id    uuid not null references public.perfis(id) on delete cascade,
  corpo       text not null check (char_length(btrim(corpo)) between 1 and 8000),
  imagem_url  text,
  criado_em   timestamptz not null default now(),
  editado_em  timestamptz
);

create index if not exists respostas_topico on public.respostas (topico_id, criado_em);

-- "Eu também tenho essa dúvida". Um por agente, por tópico.
create table if not exists public.reacoes (
  topico_id  bigint not null references public.topicos(id) on delete cascade,
  perfil_id  uuid   not null references public.perfis(id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (topico_id, perfil_id)
);

-- O código da turma. Esta tabela é a única do projeto que ninguém consegue
-- ler pela API: não tem GRANT nem policy. Só a função filiar() enxerga.
create table if not exists public.turma (
  id         int primary key default 1 check (id = 1),
  codigo     text not null,
  criado_em  timestamptz not null default now()
);

-- >>> TROQUE <<< o código abaixo pelo que você vai ditar em sala.
insert into public.turma (id, codigo) values (1, 'SINDICATO2026')
on conflict (id) do nothing;


-- ============================================================================
-- 2. FUNÇÕES
-- ============================================================================

-- Cria a ficha assim que um usuário nasce, aproveitando o que veio do
-- cadastro (nome digitado) ou do GitHub (nome, usuário e foto).
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome, github, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
      'Agente sem nome'
    ), 80),
    nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Nunca impedir o cadastro por causa da ficha: o site cria depois, se faltar.
  return new;
end $$;

-- O gatilho vive no schema auth, que é território protegido do Supabase.
-- Se o projeto não deixar criá-lo, seguimos sem drama: o site cria a ficha
-- no primeiro acesso do aluno. Por isso o bloco engole o erro.
do $$
begin
  drop trigger if exists ao_criar_usuario on auth.users;
  create trigger ao_criar_usuario
    after insert on auth.users
    for each row execute function public.criar_perfil();
  raise notice 'Gatilho de criação de ficha instalado.';
exception when others then
  raise notice 'Sem permissão para o gatilho em auth.users (%). Tudo bem: o site cria a ficha sozinho.', sqlerrm;
end $$;


-- Atalhos usados nas policies. São SECURITY DEFINER de propósito: sem isso a
-- policy de perfis consultaria perfis e o Postgres entraria em recursão.
create or replace function public.eh_filiado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.filiado from public.perfis p where p.id = auth.uid()), false);
$$;

create or replace function public.eh_docente()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.papel = 'docente' from public.perfis p where p.id = auth.uid()), false);
$$;


-- Confere o código da turma e libera a ficha.
-- Devolve um objeto em vez de dar erro para que o contador de tentativas
-- sobreviva: uma exceção desfaria a transação inteira, inclusive o contador.
create or replace function public.filiar(codigo_informado text, celula_escolhida text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_filiado boolean;
  v_tent    smallint;
  v_codigo  text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'erro', 'Você precisa entrar antes de se filiar.');
  end if;

  select p.filiado, p.tentativas into v_filiado, v_tent
    from public.perfis p where p.id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Sua ficha não foi encontrada. Saia e entre de novo.');
  end if;

  if v_filiado then
    return jsonb_build_object('ok', true, 'ja_era', true);
  end if;

  if v_tent >= 8 then
    return jsonb_build_object('ok', false,
      'erro', 'Oito tentativas erradas. Procure a docente para liberar sua ficha.');
  end if;

  select t.codigo into v_codigo from public.turma t where t.id = 1;

  if upper(btrim(codigo_informado)) is distinct from upper(btrim(v_codigo)) then
    update public.perfis set tentativas = tentativas + 1 where id = v_uid;
    return jsonb_build_object('ok', false,
      'erro', 'Código de turma incorreto. Restam ' || (7 - v_tent) || ' tentativas.');
  end if;

  update public.perfis
     set filiado    = true,
         tentativas = 0,
         celula     = coalesce(nullif(btrim(celula_escolhida), ''), celula)
   where id = v_uid;

  return jsonb_build_object('ok', true);
end $$;


-- Fixar tópico no topo é privilégio da chefia. Fica numa função porque o RLS
-- controla linhas, não colunas: assim ninguém fixa o próprio recado.
create or replace function public.fixar_topico(topico bigint, valor boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.eh_docente() then
    return false;
  end if;
  update public.topicos set fixado = valor where id = topico;
  return found;
end $$;


-- ============================================================================
-- 3. RLS — QUEM VÊ E QUEM MEXE EM CADA LINHA
-- ============================================================================

alter table public.perfis    enable row level security;
alter table public.topicos   enable row level security;
alter table public.respostas enable row level security;
alter table public.reacoes   enable row level security;
alter table public.turma     enable row level security;   -- e nenhuma policy: fechada

-- ---------- perfis ----------
-- O quadro de filiados aparece na página inicial, que é pública. Por isso o
-- visitante enxerga quem já está filiado — e nada além disso.
drop policy if exists "perfis: quadro público"   on public.perfis;
drop policy if exists "perfis: a própria ficha"  on public.perfis;
drop policy if exists "perfis: criar a própria"  on public.perfis;
drop policy if exists "perfis: editar a própria" on public.perfis;

create policy "perfis: quadro público" on public.perfis
  for select to anon, authenticated
  using (filiado);

create policy "perfis: a própria ficha" on public.perfis
  for select to authenticated
  using (id = (select auth.uid()));

create policy "perfis: criar a própria" on public.perfis
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "perfis: editar a própria" on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------- tópicos ----------
drop policy if exists "topicos: filiados leem"   on public.topicos;
drop policy if exists "topicos: filiados criam"  on public.topicos;
drop policy if exists "topicos: dono edita"      on public.topicos;
drop policy if exists "topicos: dono apaga"      on public.topicos;

create policy "topicos: filiados leem" on public.topicos
  for select to authenticated
  using (public.eh_filiado());

create policy "topicos: filiados criam" on public.topicos
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and public.eh_filiado()
    and (categoria <> 'aviso' or public.eh_docente())   -- aviso é coisa da chefia
  );

create policy "topicos: dono edita" on public.topicos
  for update to authenticated
  using      (public.eh_filiado() and (autor_id = (select auth.uid()) or public.eh_docente()))
  with check (public.eh_filiado() and (autor_id = (select auth.uid()) or public.eh_docente()));

create policy "topicos: dono apaga" on public.topicos
  for delete to authenticated
  using (autor_id = (select auth.uid()) or public.eh_docente());

-- ---------- respostas ----------
drop policy if exists "respostas: filiados leem"  on public.respostas;
drop policy if exists "respostas: filiados criam" on public.respostas;
drop policy if exists "respostas: dono edita"     on public.respostas;
drop policy if exists "respostas: dono apaga"     on public.respostas;

create policy "respostas: filiados leem" on public.respostas
  for select to authenticated
  using (public.eh_filiado());

create policy "respostas: filiados criam" on public.respostas
  for insert to authenticated
  with check (autor_id = (select auth.uid()) and public.eh_filiado());

create policy "respostas: dono edita" on public.respostas
  for update to authenticated
  using      (public.eh_filiado() and (autor_id = (select auth.uid()) or public.eh_docente()))
  with check (public.eh_filiado() and (autor_id = (select auth.uid()) or public.eh_docente()));

create policy "respostas: dono apaga" on public.respostas
  for delete to authenticated
  using (autor_id = (select auth.uid()) or public.eh_docente());

-- ---------- reações ----------
drop policy if exists "reacoes: filiados leem"   on public.reacoes;
drop policy if exists "reacoes: marcar a minha"  on public.reacoes;
drop policy if exists "reacoes: tirar a minha"   on public.reacoes;

create policy "reacoes: filiados leem" on public.reacoes
  for select to authenticated
  using (public.eh_filiado());

create policy "reacoes: marcar a minha" on public.reacoes
  for insert to authenticated
  with check (perfil_id = (select auth.uid()) and public.eh_filiado());

create policy "reacoes: tirar a minha" on public.reacoes
  for delete to authenticated
  using (perfil_id = (select auth.uid()));


-- ============================================================================
-- 4. PERMISSÕES DE API
--
-- Desde 2026 uma tabela nova do schema public não aparece sozinha na API:
-- precisa de GRANT explícito. E o GRANT por coluna é o que impede um aluno
-- de se promover a docente ou marcar a própria ficha como filiada — coisa
-- que o RLS sozinho não faz, porque ele filtra linhas, não colunas.
-- ============================================================================

grant usage on schema public to anon, authenticated;

-- perfis: o visitante lê o quadro; o aluno só escreve nas colunas inofensivas.
grant select (id, nome, github, celula, papel, avatar_url, filiado, criado_em)
  on public.perfis to anon;
grant select
  on public.perfis to authenticated;
grant insert (id, nome, github, avatar_url)
  on public.perfis to authenticated;
grant update (nome, github, celula, avatar_url)
  on public.perfis to authenticated;

-- tópicos: "fixado" fica de fora de propósito — vai pela função fixar_topico().
grant select, delete on public.topicos to authenticated;
grant insert (autor_id, titulo, corpo, categoria, missao, imagem_url) on public.topicos to authenticated;
grant update (titulo, corpo, categoria, missao, imagem_url, resolvido, editado_em) on public.topicos to authenticated;

grant select, delete on public.respostas to authenticated;
grant insert (topico_id, autor_id, corpo, imagem_url) on public.respostas to authenticated;
grant update (corpo, imagem_url, editado_em) on public.respostas to authenticated;

grant select, insert, delete on public.reacoes to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- A tabela turma não recebe nenhum grant: o código não sai do banco.
revoke all on public.turma from anon, authenticated;

-- Funções: por padrão o Postgres deixa qualquer um executar. Como filiar() e
-- fixar_topico() são SECURITY DEFINER, fechamos e liberamos só para quem entrou.
revoke all on function public.filiar(text, text)         from public, anon;
revoke all on function public.fixar_topico(bigint, boolean) from public, anon;
revoke all on function public.eh_filiado()               from public, anon;
revoke all on function public.eh_docente()               from public, anon;

grant execute on function public.filiar(text, text)         to authenticated;
grant execute on function public.fixar_topico(bigint, boolean) to authenticated;
grant execute on function public.eh_filiado()               to authenticated;
grant execute on function public.eh_docente()               to authenticated;


-- ============================================================================
-- 5. STORAGE — o depósito das imagens
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', true, 5242880,
        array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = excluded.allowed_mime_types;

-- O balde é público para leitura, então basta cuidar de quem escreve.
-- Cada agente só grava dentro da pasta com o próprio id.
-- Igual ao gatilho: storage é schema protegido, então o bloco tolera recusa.
-- Se aparecer o aviso de erro aqui, crie as três policies pelo painel:
-- Storage → Policies → New policy, com as mesmas condições abaixo.
do $$
begin
  drop policy if exists "anexos: leitura liberada" on storage.objects;
  drop policy if exists "anexos: filiado envia"    on storage.objects;
  drop policy if exists "anexos: dono troca"       on storage.objects;
  drop policy if exists "anexos: dono apaga"       on storage.objects;

  -- Sem esta policy de leitura o próprio envio quebra: o Storage devolve os
  -- dados do arquivo recém-gravado, e devolver exige poder ler. O balde já é
  -- público, então isto não abre nada que a URL da imagem não abrisse.
  execute $p$
    create policy "anexos: leitura liberada" on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'anexos')$p$;

  execute $p$
    create policy "anexos: filiado envia" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'anexos'
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and public.eh_filiado()
      )$p$;

  execute $p$
    create policy "anexos: dono troca" on storage.objects
      for update to authenticated
      using      (bucket_id = 'anexos' and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = 'anexos' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;

  execute $p$
    create policy "anexos: dono apaga" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'anexos'
        and ((storage.foldername(name))[1] = (select auth.uid())::text or public.eh_docente())
      )$p$;

  raise notice 'Permissões do depósito de imagens instaladas.';
exception when others then
  raise notice 'Não deu para criar as policies do Storage (%). Crie pelo painel: Storage → Policies.', sqlerrm;
end $$;


-- ============================================================================
-- 6. TEMPO REAL — a resposta do colega aparece sem recarregar a página
-- ============================================================================

do $$
begin
  alter publication supabase_realtime add table public.topicos;
exception when others then null;      -- já estava na publicação, ou ela não existe
end $$;

do $$
begin
  alter publication supabase_realtime add table public.respostas;
exception when others then null;
end $$;


-- ============================================================================
-- 7. DEPOIS DE RODAR — o que você ainda precisa fazer à mão
-- ============================================================================
--
-- a) Cadastre-se no site normalmente, com o código da turma.
--
-- b) Volte aqui e se promova a docente, trocando pelo seu e-mail:
--
--      update public.perfis set papel = 'docente', filiado = true
--       where id = (select id from auth.users where email = 'voce@exemplo.com');
--
--    Docente pode apagar qualquer mensagem, fixar avisos e publicar na
--    categoria "Aviso da chefia".
--
-- c) Para trocar o código da turma depois (a cada semestre, por exemplo):
--
--      update public.turma set codigo = 'NOVOCODIGO2027' where id = 1;
--
-- d) Para liberar um aluno que errou o código oito vezes:
--
--      update public.perfis set tentativas = 0
--       where id = (select id from auth.users where email = 'aluno@exemplo.com');
--
-- ============================================================================


-- ============================================================================
-- 8. ENTREGAS DE MISSÃO — ajuste seguro para bancos que já existem
--    (rodar o schema de novo aplica isto sem quebrar nada)
-- ============================================================================

alter table public.topicos drop constraint if exists topicos_categoria_check;
alter table public.topicos
  add constraint topicos_categoria_check
  check (categoria in ('duvida','material','vitoria','aviso','entrega'));

alter table public.topicos add column if not exists missao smallint;
do $$
begin
  alter table public.topicos
    add constraint topicos_missao_check check (missao is null or missao between 1 and 27);
exception when duplicate_object then null;   -- já existe
end $$;

grant insert (autor_id, titulo, corpo, categoria, missao, imagem_url) on public.topicos to authenticated;
grant update (titulo, corpo, categoria, missao, imagem_url, resolvido, editado_em) on public.topicos to authenticated;


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
