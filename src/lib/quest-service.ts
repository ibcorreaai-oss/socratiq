import type { SupabaseClient } from "@supabase/supabase-js";
import { generateQuest } from "@/lib/llm";

export type SourceType = "text" | "topic" | "pdf";

/**
 * Generates a quest via the LLM helper (or its local heuristic fallback) and persists it
 * — quest, concepts, questions — using the CALLER's own Supabase client, so normal RLS
 * (owner_id = auth.uid()) enforces ownership. Never uses the service role for this path;
 * there is nothing here a user shouldn't be able to do to their own rows.
 */
export async function createQuestFromContent(
  supabase: SupabaseClient,
  userId: string,
  opts: { sourceType: SourceType; content: string; topicHint?: string }
) {
  const { sourceType, content, topicHint } = opts;
  if (content.trim().length < 20) {
    throw new Error("That's not enough material to forge a quest from — add a bit more.");
  }

  const generated = await generateQuest(content, topicHint);

  const { data: quest, error: questError } = await supabase
    .from("quests")
    .insert({
      owner_id: userId,
      title: generated.title,
      boss_name: generated.bossName,
      source_type: sourceType,
      source_excerpt: content.slice(0, 2000),
    })
    .select("id")
    .single();

  if (questError || !quest) {
    throw new Error(questError?.message ?? "Failed to create quest.");
  }

  const conceptRows = generated.concepts.map((name, i) => ({
    quest_id: quest.id,
    owner_id: userId,
    name,
    order_index: i,
  }));

  const { data: concepts, error: conceptsError } = await supabase
    .from("concepts")
    .insert(conceptRows)
    .select("id, name");

  if (conceptsError) throw new Error(conceptsError.message);

  const conceptIdByName = new Map((concepts ?? []).map((c) => [c.name, c.id]));

  const questionRows = generated.questions.map((q, i) => ({
    quest_id: quest.id,
    concept_id: conceptIdByName.get(q.concept) ?? null,
    owner_id: userId,
    prompt: q.prompt,
    choices: q.choices,
    correct_index: q.correctIndex,
    explanation: q.explanation,
    difficulty: q.difficulty,
    order_index: i,
  }));

  const { error: questionsError } = await supabase.from("questions").insert(questionRows);
  if (questionsError) throw new Error(questionsError.message);

  return { questId: quest.id as string };
}
