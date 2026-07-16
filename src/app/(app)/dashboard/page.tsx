import Link from "next/link";
import { Swords, Clock, Trophy, Plus, FileText, Type, Upload } from "lucide-react";
import { createClient, getUserContext } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SOURCE_ICON = { text: FileText, topic: Type, pdf: Upload } as const;

export default async function DashboardPage() {
  const ctx = await getUserContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [{ data: quests }, { data: dueConcepts }, { data: leaderboard }] = await Promise.all([
    supabase
      .from("quests")
      .select("id, title, boss_name, source_type, created_at")
      .eq("owner_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("concept_mastery")
      .select("concept_name, mastery_pct, due_at")
      .eq("user_id", ctx.user.id)
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(6),
    supabase.from("profiles").select("display_name, xp, level").order("xp", { ascending: false }).limit(5),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Welcome back, {ctx.profile?.display_name ?? "Adventurer"}
          </h1>
          <p className="mt-1 text-muted">
            {quests?.length ? "Your quests are waiting." : "Summon your first quest to begin."}
          </p>
        </div>
        <Button asChild>
          <Link href="/quest/new">
            <Plus className="size-4" /> New quest
          </Link>
        </Button>
      </div>

      {dueConcepts && dueConcepts.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-muted">
              <Clock className="size-4" /> Due for review
            </h2>
            <div className="flex flex-wrap gap-2">
              {dueConcepts.map((c) => (
                <Badge key={c.concept_name} variant="gold">
                  {c.concept_name} · {c.mastery_pct}%
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted">
              These concepts are about to fade — replay the quest that covers them to lock them back in.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-sm font-semibold text-muted">Your quests</h2>
          {!quests || quests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <Swords className="size-8 text-muted" />
                <p className="text-muted">No quests yet. Summon a boss from a topic, your notes, or a PDF.</p>
                <Button asChild>
                  <Link href="/quest/new">Summon your first quest</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            quests.map((q) => {
              const Icon = SOURCE_ICON[q.source_type as keyof typeof SOURCE_ICON] ?? Type;
              return (
                <Link key={q.id} href={`/quest/${q.id}`}>
                  <Card className="transition-colors hover:bg-white/5">
                    <CardContent className="flex items-center justify-between gap-4 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <p className="font-medium">{q.title}</p>
                          <p className="text-sm text-muted">{q.boss_name}</p>
                        </div>
                      </div>
                      <Swords className="size-4 shrink-0 text-muted" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-muted">
            <Trophy className="size-4" /> Leaderboard
          </h2>
          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              {leaderboard?.map((p, i) => (
                <div key={p.display_name + i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted">#{i + 1}</span>
                    {p.display_name}
                  </span>
                  <Badge variant={i === 0 ? "gold" : "muted"}>Lv {p.level}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
