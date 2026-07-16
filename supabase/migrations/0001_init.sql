-- Socratiq — schema inicial
-- Convenções de segurança seguidas (ref_checklist_antirretrabalho_apps.md):
--   * toda tabela nova tem RLS habilitado explicitamente
--   * policy de UPDATE sempre com USING + WITH CHECK
--   * colunas sensíveis (xp/level/streak) só mutáveis por service_role (trigger guard)
--   * GRANT explícito pra authenticated E service_role (default ACL não dá select/insert/update)
--   * RPC/trigger nunca confia em auth.uid() vindo do client sem validar

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Adventurer',
  xp integer not null default 0,
  level integer not null default 1,
  streak_count integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_public_leaderboard" on public.profiles
  for select using (true);

create policy "profiles_update_own_display_name" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Guard: mesmo com a policy de UPDATE acima, um PATCH direto via REST (anon key é
-- pública no bundle) não pode alterar xp/level/streak — só service_role pode.
create or replace function public.protect_profile_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.xp := old.xp;
    new.level := old.level;
    new.streak_count := old.streak_count;
    new.longest_streak := old.longest_streak;
    new.last_active_date := old.last_active_date;
  end if;
  return new;
end;
$$;

create trigger protect_profile_stats_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_stats();

revoke execute on function public.protect_profile_stats() from public, anon, authenticated;

-- Auto-cria profile no signup. NUNCA confia em role/privilégio vindo de raw_user_meta_data
-- (não existe conceito de role neste app, mas display_name é sanitizado por tipo mesmo assim).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Adventurer')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================
-- quests
-- ============================================================
create table public.quests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  boss_name text not null,
  source_type text not null check (source_type in ('text', 'topic', 'pdf')),
  source_excerpt text,
  status text not null default 'ready' check (status in ('ready', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.quests enable row level security;

create policy "quests_select_own" on public.quests
  for select using (owner_id = auth.uid());

create policy "quests_insert_own" on public.quests
  for insert with check (owner_id = auth.uid());

create policy "quests_update_own" on public.quests
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "quests_delete_own" on public.quests
  for delete using (owner_id = auth.uid());

create index quests_owner_id_idx on public.quests (owner_id, created_at desc);

-- ============================================================
-- concepts (mapa de domínio por quest)
-- ============================================================
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  order_index integer not null default 0
);

alter table public.concepts enable row level security;

create policy "concepts_select_own" on public.concepts
  for select using (owner_id = auth.uid());

create policy "concepts_insert_own" on public.concepts
  for insert with check (owner_id = auth.uid());

create index concepts_quest_id_idx on public.concepts (quest_id);

-- ============================================================
-- questions
-- ============================================================
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests (id) on delete cascade,
  concept_id uuid references public.concepts (id) on delete set null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  prompt text not null,
  choices jsonb not null,
  correct_index integer not null,
  explanation text not null,
  difficulty smallint not null default 1 check (difficulty between 1 and 5),
  order_index integer not null default 0
);

alter table public.questions enable row level security;

create policy "questions_select_own" on public.questions
  for select using (owner_id = auth.uid());

create policy "questions_insert_own" on public.questions
  for insert with check (owner_id = auth.uid());

create index questions_quest_id_idx on public.questions (quest_id, order_index);

-- ============================================================
-- quest_attempts (uma "corrida" de batalha contra o boss)
-- Escrita só via service_role (server já validou o dono da sessão antes de chamar) —
-- por isso NÃO existe policy de insert/update pra authenticated: default-deny cobre.
-- ============================================================
create table public.quest_attempts (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  boss_max_hp integer not null,
  boss_hp integer not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  xp_earned integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.quest_attempts enable row level security;

create policy "quest_attempts_select_own" on public.quest_attempts
  for select using (user_id = auth.uid());

create index quest_attempts_user_id_idx on public.quest_attempts (user_id, started_at desc);

-- ============================================================
-- question_attempts (resposta individual dentro de uma quest_attempt)
-- ============================================================
create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  quest_attempt_id uuid not null references public.quest_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  chosen_index integer,
  is_correct boolean not null,
  used_hint boolean not null default false,
  hint_messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.question_attempts enable row level security;

create policy "question_attempts_select_own" on public.question_attempts
  for select using (user_id = auth.uid());

create index question_attempts_quest_attempt_id_idx on public.question_attempts (quest_attempt_id);

-- ============================================================
-- concept_mastery (estado de repetição espaçada por conceito)
-- ============================================================
create table public.concept_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  concept_name text not null,
  ease numeric not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  mastery_pct integer not null default 0,
  due_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, concept_id)
);

alter table public.concept_mastery enable row level security;

create policy "concept_mastery_select_own" on public.concept_mastery
  for select using (user_id = auth.uid());

create index concept_mastery_user_due_idx on public.concept_mastery (user_id, due_at);

-- ============================================================
-- GRANTs — default ACL do Postgres NÃO dá select/insert/update pra
-- authenticated/service_role em tabela criada por migration; sem isso todo
-- Route Handler com createServiceRoleClient() quebra com "permission denied".
-- ============================================================
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.profiles,
  public.quests,
  public.concepts,
  public.questions,
  public.quest_attempts,
  public.question_attempts,
  public.concept_mastery
to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
