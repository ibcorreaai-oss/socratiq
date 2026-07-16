import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { socraticReply } from "@/lib/llm";
import type { QuestQuestion, SocraticTurn } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const questionId = body?.questionId as string | undefined;
  const chosenIndex = Number(body?.chosenIndex);
  const history = Array.isArray(body?.history) ? (body.history as SocraticTurn[]) : [];

  if (!questionId || Number.isNaN(chosenIndex)) {
    return NextResponse.json({ error: "questionId and chosenIndex are required." }, { status: 400 });
  }

  // Own-row select is RLS-enforced (owner_id = auth.uid()) — never trust question
  // content the client claims to be answering; always re-fetch it server-side.
  const { data: row, error } = await supabase
    .from("questions")
    .select("id, prompt, choices, correct_index, explanation, difficulty, concepts(name)")
    .eq("id", questionId)
    .single();

  if (error || !row) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const concept =
    (Array.isArray(row.concepts) ? row.concepts[0]?.name : (row.concepts as { name?: string } | null)?.name) ??
    "this topic";

  const question: QuestQuestion = {
    id: row.id,
    concept,
    difficulty: row.difficulty as QuestQuestion["difficulty"],
    prompt: row.prompt,
    choices: row.choices as string[],
    correctIndex: row.correct_index,
    explanation: row.explanation,
  };

  const choiceText = question.choices[chosenIndex] ?? "an unclear option";
  const reply = await socraticReply(question, choiceText, history.slice(-6));

  return NextResponse.json({ reply });
}
