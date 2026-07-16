"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Send, Loader2, ArrowRight, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SocraticTurn } from "@/lib/types";

export interface BattleQuestion {
  id: string;
  concept: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  choices: string[];
}

type Phase = "loading" | "question" | "hint" | "reveal" | "finishing";

export function BattleArena({
  questId,
  title,
  bossName,
  questions,
}: {
  questId: string;
  title: string;
  bossName: string;
  questions: BattleQuestion[];
}) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [bossHp, setBossHp] = useState(questions.length * 10);
  const [bossMaxHp, setBossMaxHp] = useState(questions.length * 10);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [chosen, setChosen] = useState<number | null>(null);
  const [hit, setHit] = useState(false);
  const [reveal, setReveal] = useState<{ correctIndex: number; explanation: string } | null>(null);
  const [history, setHistory] = useState<SocraticTurn[]>([]);
  const [hintInput, setHintInput] = useState("");
  const [hintLoading, setHintLoading] = useState(false);
  const [totalXp, setTotalXp] = useState(0);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const question = questions[index];

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("start_quest_attempt", { p_quest_id: questId });
      if (error || !data?.[0]) {
        toast.error("Couldn't start this quest — try again.");
        return;
      }
      setAttemptId(data[0].id);
      setBossHp(data[0].boss_hp);
      setBossMaxHp(data[0].boss_max_hp);
      setPhase("question");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  async function pickChoice(choiceIndex: number) {
    // Guards against a fast double-click firing two `submit_answer` calls for
    // the same question before `phase` state updates — the DB now rejects
    // the second one too (unique constraint), but disabling immediately here
    // avoids even sending it and keeps the UI from flashing two outcomes.
    if (!attemptId || phase !== "question" || submitting) return;
    setSubmitting(true);
    setChosen(choiceIndex);

    const { data, error } = await supabase.rpc("submit_answer", {
      p_quest_attempt_id: attemptId,
      p_question_id: question.id,
      p_chosen_index: choiceIndex,
      p_used_hint: false,
    });

    setSubmitting(false);

    if (error || !data?.[0]) {
      toast.error("That didn't go through — try again.");
      setChosen(null);
      return;
    }

    const result = data[0];
    setBossHp(result.boss_hp);
    setTotalXp((v) => v + result.xp_awarded);
    // The last question in the quest marks quest_completed even when answered
    // incorrectly (boss survives) — otherwise a student who misses even one
    // question runs out of questions with no results screen. `advance()` and
    // the reveal "Continue" button both check this before moving on.
    setQuestCompleted(result.quest_completed);

    if (result.is_correct) {
      setHit(true);
      toast.success(`+${result.xp_awarded} XP`, { icon: <Sparkles className="size-4" /> });
      setTimeout(() => setHit(false), 400);
      setTimeout(() => advance(result.quest_completed), 700);
    } else {
      setReveal({ correctIndex: result.correct_index, explanation: result.explanation });
      setHistory([]);
      setPhase("hint");
    }
  }

  async function askSage(message?: string) {
    if (!attemptId) return;
    const userTurn: SocraticTurn | null = message ? { role: "student", content: message } : null;
    const nextHistory = userTurn ? [...history, userTurn] : history;
    if (userTurn) {
      setHistory(nextHistory);
      setHintInput("");
    }
    setHintLoading(true);
    try {
      const res = await fetch("/api/sage/hint", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId: question.id, chosenIndex: chosen, history: nextHistory }),
      });
      const data = await res.json();
      if (res.ok) {
        setHistory((h) => [...h, { role: "sage", content: data.reply }]);
      }
    } finally {
      setHintLoading(false);
    }
  }

  useEffect(() => {
    if (phase === "hint" && history.length === 0) {
      void (async () => {
        await askSage();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function advance(completedOverride?: boolean) {
    const completed = completedOverride ?? questCompleted;
    if (completed) {
      if (attemptId) {
        setPhase("finishing");
        finishAndRedirect(attemptId);
      }
      return;
    }
    setChosen(null);
    setReveal(null);
    setHistory([]);
    setPhase("question");
    setIndex((i) => i + 1);
  }

  async function finishAndRedirect(id: string) {
    await supabase.rpc("finish_quest_attempt", { p_quest_attempt_id: id });
    router.push(`/quest/${questId}/results?attempt=${id}`);
  }

  const pct = Math.round((bossHp / bossMaxHp) * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <div>
        <p className="text-sm text-muted">{title}</p>
        <div className="mt-1 flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">{bossName}</h1>
          <Badge variant="muted">
            {Math.min(index + 1, questions.length)} / {questions.length}
          </Badge>
        </div>
      </div>

      <motion.div
        animate={hit ? { x: [0, -6, 6, -4, 4, 0], rotate: [0, -1, 1, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4 py-4"
      >
        <div
          className="relative aspect-square w-40 shrink-0"
          style={{
            clipPath: "polygon(50% 0%, 90% 25%, 100% 70%, 50% 100%, 0% 70%, 10% 25%)",
            background: `linear-gradient(160deg, rgba(139,92,246,${0.35 + (pct / 100) * 0.5}), rgba(251,191,36,${0.15 + (pct / 100) * 0.25}))`,
            border: "1px solid rgba(139,92,246,0.5)",
            boxShadow: hit ? "0 0 60px -8px rgba(248,113,113,0.6)" : "0 0 50px -12px rgba(139,92,246,0.6)",
            opacity: 0.35 + (pct / 100) * 0.65,
          }}
        />
        <div className="w-full max-w-xs">
          <Progress value={pct} barClassName={pct < 30 ? "bg-danger" : "bg-primary"} />
          <p className="mt-1 text-center text-xs text-muted">
            {bossHp} / {bossMaxHp} HP
          </p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <div className="flex flex-1 items-center justify-center py-16 text-muted">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}

        {phase !== "loading" && phase !== "finishing" && question && (
          <motion.div
            key={question.id + phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{question.concept}</Badge>
                  <Badge variant="default">Difficulty {question.difficulty}</Badge>
                </div>
                <p className="text-lg font-medium leading-relaxed">{question.prompt}</p>

                <div className="flex flex-col gap-2">
                  {question.choices.map((choice, i) => {
                    const isChosen = chosen === i;
                    const isCorrectReveal = reveal && i === reveal.correctIndex;
                    const isWrongChosen = reveal && isChosen && i !== reveal.correctIndex;
                    return (
                      <button
                        key={i}
                        disabled={phase !== "question" || submitting}
                        onClick={() => pickChoice(i)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                          phase === "question" && "border-border bg-background/40 hover:bg-white/5",
                          isCorrectReveal && "border-success/60 bg-success/10 text-success",
                          isWrongChosen && "border-danger/60 bg-danger/10 text-danger",
                          !reveal && isChosen && "border-primary/60 bg-primary/10"
                        )}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {choice}
                      </button>
                    );
                  })}
                </div>

                {phase === "hint" && (
                  <div className="mt-2 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <Sparkles className="size-4" /> The Sage
                    </div>
                    <div className="flex flex-col gap-2">
                      {history.map((turn, i) => (
                        <p
                          key={i}
                          className={cn(
                            "text-sm",
                            turn.role === "sage" ? "text-foreground" : "text-muted italic"
                          )}
                        >
                          {turn.role === "student" ? "You: " : ""}
                          {turn.content}
                        </p>
                      ))}
                      {hintLoading && <Loader2 className="size-4 animate-spin text-muted" />}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={hintInput}
                        onChange={(e) => setHintInput(e.target.value)}
                        placeholder="Reason it out loud…"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && hintInput.trim()) askSage(hintInput.trim());
                        }}
                        disabled={hintLoading}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={hintLoading || !hintInput.trim()}
                        onClick={() => askSage(hintInput.trim())}
                      >
                        <Send className="size-4" />
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setPhase("reveal")}>
                        <Eye className="size-4" /> Just show me
                      </Button>
                    </div>
                  </div>
                )}

                {phase === "reveal" && reveal && (
                  <div className="mt-2 flex flex-col gap-3 rounded-lg border border-gold/30 bg-gold/5 p-4">
                    <p className="text-sm">{reveal.explanation}</p>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => advance()}>
                        Continue <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {phase === "finishing" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <Sparkles className="size-8 text-gold" />
            <p className="font-display text-lg">
              {bossHp <= 0 ? `${bossName} has fallen.` : "Quest complete."}
            </p>
            <p className="text-sm text-muted">Tallying {totalXp} XP…</p>
            <Loader2 className="size-5 animate-spin text-muted" />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
