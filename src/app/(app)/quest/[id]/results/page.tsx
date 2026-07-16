import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles, Flame, ArrowRight, RotateCcw } from "lucide-react";
import { createClient, getUserContext } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function QuestResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { id } = await params;
  const { attempt: attemptId } = await searchParams;
  const ctx = await getUserContext();
  if (!ctx || !attemptId) notFound();

  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("quest_attempts")
    .select("id, boss_hp, boss_max_hp, xp_earned, status")
    .eq("id", attemptId)
    .single();
  if (!attempt) notFound();

  const { data: quest } = await supabase.from("quests").select("title, boss_name").eq("id", id).single();

  const { data: questionAttempts } = await supabase
    .from("question_attempts")
    .select("is_correct, used_hint")
    .eq("quest_attempt_id", attemptId);

  const total = questionAttempts?.length ?? 0;
  const correct = questionAttempts?.filter((q) => q.is_correct).length ?? 0;
  const bossDefeated = attempt.boss_hp <= 0;

  // Scoped to THIS quest's concepts — without the join filter, a user who has
  // played another quest more recently would see that quest's mastery data
  // here instead (concept_mastery is global per user+concept, ordered by
  // updated_at, so "most recent" isn't necessarily "from this run").
  const { data: concepts } = await supabase
    .from("concept_mastery")
    .select("concept_name, mastery_pct, due_at, concepts!inner(quest_id)")
    .eq("concepts.quest_id", id)
    .order("updated_at", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 py-8 text-center">
      <Sparkles className="size-10 text-gold" />
      <div>
        <p className="text-sm text-muted">{quest?.title}</p>
        <h1 className="font-display text-3xl font-semibold">
          {bossDefeated ? `${quest?.boss_name} has fallen!` : "Quest complete"}
        </h1>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        <Stat label="Correct" value={`${correct}/${total}`} />
        <Stat label="XP earned" value={`+${attempt.xp_earned}`} />
        <Stat label="Accuracy" value={total ? `${Math.round((correct / total) * 100)}%` : "—"} />
      </div>

      {concepts && concepts.length > 0 && (
        <Card className="w-full text-left">
          <CardContent className="flex flex-col gap-3 p-6">
            <h2 className="font-display text-sm font-semibold text-muted">Mastery map</h2>
            {concepts.map((c) => (
              <div key={c.concept_name} className="flex items-center justify-between gap-3">
                <span className="text-sm">{c.concept_name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, c.mastery_pct)}%` }}
                    />
                  </div>
                  <Badge variant={c.mastery_pct >= 70 ? "success" : c.mastery_pct >= 40 ? "default" : "danger"}>
                    {c.mastery_pct}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/quest/${id}`}>
            <RotateCcw className="size-4" /> Battle again
          </Link>
        </Button>
        <Button asChild variant="primary">
          <Link href="/dashboard">
            Dashboard <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1 p-4">
        <span className="font-display text-xl font-semibold">{value}</span>
        <span className="flex items-center gap-1 text-xs text-muted">
          {label === "XP earned" && <Flame className="size-3" />}
          {label}
        </span>
      </CardContent>
    </Card>
  );
}
