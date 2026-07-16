-- Fixes a double-submit bug: nothing stopped the same question from being
-- answered twice within one quest_attempt (e.g. a fast double-click firing
-- two `submit_answer` RPC calls before the client's `phase` state updated to
-- disable the choice buttons). Each extra submission dealt bonus boss damage,
-- double-awarded XP, and inflated the "questions answered" count used by
-- `submit_answer` to decide quest completion — a double-submit on one
-- question could end the run a full question early.
--
-- The unique constraint is the real guarantee (atomic at the DB level, closes
-- the race a plain "select exists" check can't); the explicit check inside
-- the function turns that into a clean, expected error instead of a raw
-- unique-violation bubbling up to the client.

alter table public.question_attempts
  add constraint question_attempts_unique_per_attempt unique (quest_attempt_id, question_id);

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

  if exists (
    select 1 from public.question_attempts qa2
    where qa2.quest_attempt_id = p_quest_attempt_id and qa2.question_id = p_question_id
  ) then
    raise exception 'question already answered in this attempt';
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
