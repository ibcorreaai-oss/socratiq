-- Battle RPCs — every write that touches xp/streak/attempts goes through these
-- SECURITY DEFINER functions instead of a service-role key in the app server.
-- Correctness is ALWAYS recomputed here from the stored correct_index, never
-- trusted from the client (see server-actions security guidance, Next 16 docs).
--
-- Why a bypass flag instead of "auth.uid() is null": these functions run with
-- elevated table privileges (SECURITY DEFINER) but auth.uid() still resolves
-- to the CALLING user's JWT claim regardless — SECURITY DEFINER changes the
-- privilege role, not the auth GUC. So protect_profile_stats() would still
-- see a non-null auth.uid() and revert the xp/streak write. `app.bypass_stats_guard`
-- is a transaction-local session var (`set_config(..., true)`) that only this
-- trusted function sets — it is not reachable from the REST/RPC surface a
-- client can call directly (set_config on arbitrary keys isn't an exposed RPC).

create or replace function public.protect_profile_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.bypass_stats_guard', true), 'false') <> 'true' then
    new.xp := old.xp;
    new.level := old.level;
    new.streak_count := old.streak_count;
    new.longest_streak := old.longest_streak;
    new.last_active_date := old.last_active_date;
  end if;
  return new;
end;
$$;

-- ============================================================
-- start_quest_attempt
-- ============================================================
create or replace function public.start_quest_attempt(p_quest_id uuid)
returns table (id uuid, boss_hp integer, boss_max_hp integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_question_count integer;
  v_max_hp integer;
  v_id uuid;
begin
  select owner_id into v_owner from public.quests where quests.id = p_quest_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not found' using errcode = 'PGRST';
  end if;

  select count(*) into v_question_count from public.questions where questions.quest_id = p_quest_id;
  if v_question_count = 0 then
    raise exception 'quest has no questions';
  end if;

  v_max_hp := v_question_count * 10;

  insert into public.quest_attempts (quest_id, user_id, boss_max_hp, boss_hp)
  values (p_quest_id, auth.uid(), v_max_hp, v_max_hp)
  returning quest_attempts.id into v_id;

  return query select v_id, v_max_hp, v_max_hp;
end;
$$;

revoke all on function public.start_quest_attempt(uuid) from public, anon;
grant execute on function public.start_quest_attempt(uuid) to authenticated;

-- ============================================================
-- submit_answer
-- ============================================================
create or replace function public.submit_answer(
  p_quest_attempt_id uuid,
  p_question_id uuid,
  p_chosen_index integer,
  p_used_hint boolean default false
)
returns table (
  is_correct boolean,
  boss_hp integer,
  boss_max_hp integer,
  xp_awarded integer,
  correct_index integer,
  explanation text,
  quest_completed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_question record;
  v_is_correct boolean;
  v_difficulty integer;
  v_xp integer;
  v_new_hp integer;
  v_total_questions integer;
  v_answered_questions integer;
  v_completed boolean;
begin
  select * into v_attempt from public.quest_attempts qa
    where qa.id = p_quest_attempt_id and qa.user_id = auth.uid() for update;
  if v_attempt is null then
    raise exception 'not found' using errcode = 'PGRST';
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'quest attempt already completed';
  end if;

  select * into v_question from public.questions q
    where q.id = p_question_id and q.quest_id = v_attempt.quest_id;
  if v_question is null then
    raise exception 'question not found for this quest';
  end if;

  v_is_correct := (p_chosen_index = v_question.correct_index);
  v_difficulty := v_question.difficulty;
  v_xp := case
    when v_is_correct then round((8 + v_difficulty * 4) * (case when p_used_hint then 0.6 else 1 end))
    else 0
  end;
  v_new_hp := case when v_is_correct then greatest(0, v_attempt.boss_hp - 10) else v_attempt.boss_hp end;

  insert into public.question_attempts (quest_attempt_id, question_id, user_id, chosen_index, is_correct, used_hint)
  values (p_quest_attempt_id, p_question_id, auth.uid(), p_chosen_index, v_is_correct, p_used_hint);

  -- Completion is boss defeated OR every question in the quest has now been
  -- attempted — without the second condition, a student who misses even one
  -- question runs out of questions before boss_hp can reach 0 and gets stuck
  -- with no results screen and no XP/streak ever finalized.
  select count(*) into v_total_questions from public.questions where questions.quest_id = v_attempt.quest_id;
  select count(*) into v_answered_questions from public.question_attempts
    where question_attempts.quest_attempt_id = p_quest_attempt_id;
  v_completed := v_new_hp <= 0 or v_answered_questions >= v_total_questions;

  update public.quest_attempts
    set boss_hp = v_new_hp,
        xp_earned = xp_earned + v_xp,
        status = case when v_completed then 'completed' else status end,
        completed_at = case when v_completed then now() else completed_at end
    where quest_attempts.id = p_quest_attempt_id;

  return query select v_is_correct, v_new_hp, v_attempt.boss_max_hp, v_xp, v_question.correct_index, v_question.explanation, v_completed;
end;
$$;

revoke all on function public.submit_answer(uuid, uuid, integer, boolean) from public, anon;
grant execute on function public.submit_answer(uuid, uuid, integer, boolean) to authenticated;

-- ============================================================
-- finish_quest_attempt — awards XP/streak/level, updates spaced-repetition
-- mastery per concept. Idempotent: safe to call once the attempt is already
-- 'completed' (returns current totals without double-awarding).
-- ============================================================
create or replace function public.finish_quest_attempt(p_quest_attempt_id uuid)
returns table (
  xp_earned integer,
  total_xp integer,
  level integer,
  leveled_up boolean,
  streak_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt record;
  v_profile record;
  v_already_awarded boolean;
  v_old_level integer;
  v_new_total_xp integer;
  v_new_level integer;
  v_today date := current_date;
  v_new_streak integer;
  v_concept record;
begin
  select * into v_attempt from public.quest_attempts qa
    where qa.id = p_quest_attempt_id and qa.user_id = auth.uid() for update;
  if v_attempt is null then
    raise exception 'not found' using errcode = 'PGRST';
  end if;

  select * into v_profile from public.profiles where profiles.id = auth.uid() for update;

  v_already_awarded := v_attempt.status = 'completed' and v_attempt.completed_at is not null
    and exists (
      select 1 from public.concept_mastery cm
      where cm.user_id = auth.uid() and cm.updated_at >= v_attempt.completed_at - interval '1 minute'
    );

  perform set_config('app.bypass_stats_guard', 'true', true);

  if not v_already_awarded then
    v_old_level := v_profile.level;
    v_new_total_xp := v_profile.xp + v_attempt.xp_earned;
    v_new_level := 1;
    while v_new_total_xp >= (50 * (v_new_level + 1) * v_new_level) loop
      v_new_level := v_new_level + 1;
    end loop;

    if v_profile.last_active_date = v_today then
      v_new_streak := v_profile.streak_count;
    elsif v_profile.last_active_date = v_today - 1 then
      v_new_streak := v_profile.streak_count + 1;
    else
      v_new_streak := 1;
    end if;

    update public.profiles
      set xp = v_new_total_xp,
          level = v_new_level,
          streak_count = v_new_streak,
          longest_streak = greatest(longest_streak, v_new_streak),
          last_active_date = v_today
      where profiles.id = auth.uid();

    update public.quest_attempts
      set status = 'completed', completed_at = coalesce(completed_at, now())
      where quest_attempts.id = p_quest_attempt_id;

    -- Per-concept spaced repetition (SM-2 lite)
    for v_concept in
      select qs.concept_id, c.name as concept_name,
             avg(case when qa2.is_correct then 1.0 else 0.0 end) as accuracy,
             bool_or(qa2.used_hint) as any_hint
      from public.question_attempts qa2
      join public.questions qs on qs.id = qa2.question_id
      join public.concepts c on c.id = qs.concept_id
      where qa2.quest_attempt_id = p_quest_attempt_id and qs.concept_id is not null
      group by qs.concept_id, c.name
    loop
      declare
        v_quality integer := case
          when v_concept.accuracy = 1 and not v_concept.any_hint then 5
          when v_concept.accuracy >= 0.5 then 3
          else 0
        end;
        v_existing record;
        v_ease numeric;
        v_interval integer;
        v_reps integer;
        v_mastery integer;
      begin
        select * into v_existing from public.concept_mastery cm
          where cm.user_id = auth.uid() and cm.concept_id = v_concept.concept_id;

        v_ease := coalesce(v_existing.ease, 2.5);
        v_interval := coalesce(v_existing.interval_days, 0);
        v_reps := coalesce(v_existing.repetitions, 0);

        if v_quality < 3 then
          v_reps := 0;
          v_interval := 1;
        else
          v_reps := v_reps + 1;
          if v_reps = 1 then v_interval := 1;
          elsif v_reps = 2 then v_interval := 6;
          else v_interval := round(v_interval * v_ease);
          end if;
          v_ease := greatest(1.3, v_ease + (0.1 - (5 - v_quality) * (0.08 + (5 - v_quality) * 0.02)));
        end if;

        v_mastery := round((coalesce(v_existing.mastery_pct, 0) * 0.4) + ((v_quality / 5.0) * 100 * 0.6));

        insert into public.concept_mastery (user_id, concept_id, concept_name, ease, interval_days, repetitions, mastery_pct, due_at, updated_at)
        values (auth.uid(), v_concept.concept_id, v_concept.concept_name, v_ease, v_interval, v_reps, v_mastery, now() + (v_interval || ' days')::interval, now())
        on conflict (user_id, concept_id) do update
          set ease = excluded.ease,
              interval_days = excluded.interval_days,
              repetitions = excluded.repetitions,
              mastery_pct = excluded.mastery_pct,
              due_at = excluded.due_at,
              updated_at = now();
      end;
    end loop;
  else
    v_new_total_xp := v_profile.xp;
    v_new_level := v_profile.level;
    v_old_level := v_profile.level;
    v_new_streak := v_profile.streak_count;
  end if;

  return query select v_attempt.xp_earned, v_new_total_xp, v_new_level, (v_new_level > v_old_level), v_new_streak;
end;
$$;

revoke all on function public.finish_quest_attempt(uuid) from public, anon;
grant execute on function public.finish_quest_attempt(uuid) to authenticated;
