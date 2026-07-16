import { notFound } from "next/navigation";
import { createClient, getUserContext } from "@/lib/supabase/server";
import { BattleArena, type BattleQuestion } from "@/components/quest/battle-arena";

export default async function QuestBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUserContext();
  if (!ctx) notFound();

  const supabase = await createClient();

  const { data: quest } = await supabase.from("quests").select("id, title, boss_name").eq("id", id).single();
  if (!quest) notFound();

  // Deliberately NOT selecting correct_index/explanation here — those would leak
  // into the client bundle/RSC payload before the student answers. Grading (and the
  // reveal) happens server-side inside submit_answer(), which returns them post-hoc.
  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, prompt, choices, difficulty, concepts(name)")
    .eq("quest_id", id)
    .order("order_index", { ascending: true });

  if (!questionRows || questionRows.length === 0) notFound();

  const questions: BattleQuestion[] = questionRows.map((row) => ({
    id: row.id,
    concept:
      (Array.isArray(row.concepts) ? row.concepts[0]?.name : (row.concepts as { name?: string } | null)?.name) ??
      "General",
    difficulty: row.difficulty as BattleQuestion["difficulty"],
    prompt: row.prompt,
    choices: row.choices as string[],
  }));

  return <BattleArena questId={quest.id} title={quest.title} bossName={quest.boss_name} questions={questions} />;
}
