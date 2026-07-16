export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface QuestQuestion {
  id: string;
  concept: string;
  difficulty: Difficulty;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedQuest {
  title: string;
  bossName: string;
  concepts: string[];
  questions: QuestQuestion[];
}

export interface SocraticTurn {
  role: "sage" | "student";
  content: string;
}

// ---------------------------------------------------------------------
// DB row shapes (see supabase/migrations/0001_init.sql)
// ---------------------------------------------------------------------

export interface ProfileRow {
  id: string;
  display_name: string;
  xp: number;
  level: number;
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at: string;
}

export interface QuestRow {
  id: string;
  owner_id: string;
  title: string;
  boss_name: string;
  source_type: "text" | "topic" | "pdf";
  source_excerpt: string | null;
  status: "ready" | "archived";
  created_at: string;
}

export interface ConceptRow {
  id: string;
  quest_id: string;
  owner_id: string;
  name: string;
  order_index: number;
}

export interface QuestionRow {
  id: string;
  quest_id: string;
  concept_id: string | null;
  owner_id: string;
  prompt: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  difficulty: Difficulty;
  order_index: number;
}

/** Question shape safe to send to the browser BEFORE it's answered — never
 *  leak correct_index/explanation up front or the battle is trivial to cheat. */
export type PublicQuestion = Omit<QuestionRow, "correct_index" | "explanation">;

export interface QuestAttemptRow {
  id: string;
  quest_id: string;
  user_id: string;
  boss_max_hp: number;
  boss_hp: number;
  status: "in_progress" | "completed";
  xp_earned: number;
  started_at: string;
  completed_at: string | null;
}

export interface QuestionAttemptRow {
  id: string;
  quest_attempt_id: string;
  question_id: string;
  user_id: string;
  chosen_index: number | null;
  is_correct: boolean;
  used_hint: boolean;
  hint_messages: SocraticTurn[];
  created_at: string;
}

export interface ConceptMasteryRow {
  id: string;
  user_id: string;
  concept_id: string;
  concept_name: string;
  ease: number;
  interval_days: number;
  repetitions: number;
  mastery_pct: number;
  due_at: string;
  updated_at: string;
}
