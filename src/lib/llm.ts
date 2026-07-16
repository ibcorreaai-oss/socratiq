import { z } from "zod";
import type { GeneratedQuest, QuestQuestion, SocraticTurn } from "./types";

/**
 * Central LLM helper. Provider order: Groq (free, default) → OpenRouter →
 * Anthropic → local heuristic. Keys are read from env only, never
 * hardcoded — see ref_ia_groq_e_badge_hydration.md. The app must keep
 * working (degraded) with zero keys configured, so every caller falls
 * back to a deterministic local generator on failure.
 */

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chatCompletion(
  messages: ChatMessage[],
  { json = false }: { json?: boolean } = {},
): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (groqKey) {
    const out = await tryOpenAiCompatible(
      "https://api.groq.com/openai/v1/chat/completions",
      groqKey,
      "llama-3.3-70b-versatile",
      messages,
      json,
    );
    if (out) return out;
  }

  if (openRouterKey) {
    const out = await tryOpenAiCompatible(
      "https://openrouter.ai/api/v1/chat/completions",
      openRouterKey,
      "meta-llama/llama-3.3-70b-instruct:free",
      messages,
      json,
    );
    if (out) return out;
  }

  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2048,
          system: messages.find((m) => m.role === "system")?.content,
          messages: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.content?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

async function tryOpenAiCompatible(
  endpoint: string,
  key: string,
  model: string,
  messages: ChatMessage[],
  json: boolean,
): Promise<string | null> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

const questionSchema = z.object({
  id: z.string(),
  concept: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  prompt: z.string(),
  choices: z.array(z.string()).min(3).max(5),
  correctIndex: z.number().int().min(0),
  explanation: z.string(),
});

const questSchema = z.object({
  title: z.string(),
  bossName: z.string(),
  concepts: z.array(z.string()).min(3).max(10),
  questions: z.array(questionSchema).min(5),
});

export async function generateQuest(
  content: string,
  topicHint?: string,
): Promise<GeneratedQuest> {
  const trimmed = content.slice(0, 12000);

  const raw = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are the quest architect for Socratiq, a study app that turns material into a boss-battle quiz. " +
          "Given study content, output STRICT JSON (no markdown fences) matching this TypeScript type:\n" +
          '{ "title": string, "bossName": string, "concepts": string[3..8], "questions": Array<{ "id": string, "concept": string, "difficulty": 1|2|3|4|5, "prompt": string, "choices": string[4], "correctIndex": number, "explanation": string }> }\n' +
          "Rules: produce 8 to 12 questions. Escalate difficulty from 1 (recall) to 5 (applied/tricky). " +
          "Every question must test genuine understanding of the content, never trivia unrelated to it. " +
          "bossName should be a evocative 'knowledge golem' name related to the topic (e.g. 'The Mitosis Warden'). " +
          "explanation must teach the concept in 1-2 sentences, written for a student who just got it wrong.",
      },
      {
        role: "user",
        content: `Topic hint: ${topicHint ?? "(infer from content)"}\n\nContent:\n${trimmed}`,
      },
    ],
    { json: true },
  );

  if (raw) {
    try {
      const parsed = questSchema.parse(JSON.parse(raw));
      return withIds(parsed);
    } catch {
      // fall through to heuristic
    }
  }

  return heuristicQuest(trimmed, topicHint);
}

function withIds(quest: z.infer<typeof questSchema>): GeneratedQuest {
  return {
    ...quest,
    questions: quest.questions.map((q, i) => ({ ...q, id: q.id || `q-${i}` })),
  };
}

const SOCRATIC_SYSTEM = `You are "the Sage" in Socratiq — a warm, patient study mentor. A student just answered a
quiz question incorrectly. Your job is NOT to reveal the correct answer. Instead, ask ONE short,
guiding question (Socratic method) that nudges them toward reasoning it out themselves, referencing
what they got wrong specifically. Keep it to 1-3 sentences, encouraging tone, never condescending.
If the conversation shows the student has now clearly reasoned to the right idea, congratulate them
and confirm the concept in one sentence — still without a robotic "correct answer is X" dump unless
they explicitly ask you to just reveal it.`;

export async function socraticReply(
  question: QuestQuestion,
  studentChoice: string,
  history: SocraticTurn[],
): Promise<string> {
  const raw = await chatCompletion([
    { role: "system", content: SOCRATIC_SYSTEM },
    {
      role: "user",
      content: `Question: ${question.prompt}\nConcept: ${question.concept}\nStudent picked: "${studentChoice}" (incorrect).\nCorrect answer (for your reasoning only, NEVER state it outright unless asked): ${question.choices[question.correctIndex]}`,
    },
    ...history.map((t) => ({
      role: (t.role === "sage" ? "assistant" : "user") as "assistant" | "user",
      content: t.content,
    })),
  ]);

  if (raw) return raw.trim();

  return heuristicSocraticReply(question, history);
}

// ---------- Local heuristic fallback (zero API keys required) ----------

function extractSentences(content: string): string[] {
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 35 && s.length < 240);
}

function salientWord(sentence: string): string {
  const words = sentence
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(" ")
    .filter((w) => w.length > 4);
  if (words.length === 0) return sentence.split(" ")[0] ?? "concept";
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

function heuristicQuest(content: string, topicHint?: string): GeneratedQuest {
  const sentences = extractSentences(content);
  const pool = sentences.length >= 6 ? sentences : [
    ...sentences,
    "This topic connects several core ideas that build on one another.",
    "Understanding the underlying mechanism helps predict edge cases.",
    "Applying this concept in a new context is the real test of mastery.",
    "The relationship between cause and effect here is often misunderstood.",
    "Reviewing this concept later helps move it into long-term memory.",
    "Breaking the idea into smaller steps makes it easier to reason about.",
  ];

  const terms = Array.from(new Set(pool.map(salientWord))).filter(Boolean);
  const title = topicHint?.trim() || "Your Uploaded Material";
  // `concepts` (returned below) is the authoritative list the caller persists
  // as concept rows — every question's `concept` MUST be one of these strings
  // verbatim, or quest-service's name->id lookup misses and the question ends
  // up with concept_id=null, silently opting it out of mastery/spaced-repetition
  // tracking. Cycle through `terms` per-question instead of reusing `title`.
  const concepts = terms.slice(0, 6).length ? terms.slice(0, 6) : [title];
  const questions: QuestQuestion[] = pool.slice(0, 10).map((sentence, i) => {
    const answer = salientWord(sentence);
    const blanked = sentence.replace(answer, "ـ____ـ");
    const distractors = terms
      .filter((t) => t !== answer)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    while (distractors.length < 3) distractors.push(`option-${distractors.length + 1}`);
    const choices = [...distractors, answer].sort(() => Math.random() - 0.5);
    return {
      id: `q-${i}`,
      concept: concepts[i % concepts.length],
      difficulty: (Math.min(5, Math.floor(i / 2) + 1) as QuestQuestion["difficulty"]),
      prompt: `Fill the gap: "${blanked}"`,
      choices,
      correctIndex: choices.indexOf(answer),
      explanation: `The original passage reads: "${sentence}"`,
    };
  });

  return {
    title: `The ${title} Trial`,
    bossName: `The ${terms[0] ?? "Knowledge"} Golem`,
    concepts,
    questions,
  };
}

function heuristicSocraticReply(question: QuestQuestion, history: SocraticTurn[]): string {
  const scaffolds = [
    `Let's slow down. Looking back at "${question.concept}" — what's the one detail in the question that made you hesitate?`,
    "If you eliminate the option you're least sure about, what are you left with — and why does that feel more right?",
    "What would have to be true for your original answer to be correct? Does the question actually say that?",
    "Try explaining the concept out loud in your own words, as if teaching a friend — where does the explanation get shaky?",
  ];
  return scaffolds[Math.min(history.length, scaffolds.length - 1)];
}
