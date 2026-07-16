# Socratiq

**Don't just answer. Understand.**

Built for the [Build Beyond Hackathon](https://build-beyond-hackathon.devpost.com/).

Socratiq turns any study material — a topic, pasted notes, or a lecture PDF — into an
adaptive "boss battle" quiz. Every correct answer cracks the knowledge golem's crystal
armor. Get one wrong, and instead of a red X, **the Sage** — an AI mentor — asks a
guiding Socratic question instead of handing over the answer. Progress is tracked with
XP, streaks, and a per-concept mastery map driven by real spaced-repetition scheduling
(SM-2), so concepts you're about to forget resurface right before you forget them.

## Why this, not another AI flashcard app

Being told an answer feels like progress but rarely sticks. Being guided to find it
yourself is slower — and it's the difference between recognizing a fact and actually
owning it. That single idea drives every product decision here: grading always happens
server-side first (so the game state can't be spoofed), and the *hint* path never leaks
the answer — it re-engages the student instead.

## Stack

- **Next.js 16** (App Router, Route Handlers, Server Actions) + TypeScript + Tailwind v4
- **Supabase** (Postgres + Auth) — all game-state mutations (XP, streak, boss HP,
  spaced-repetition mastery) go through `SECURITY DEFINER` Postgres RPC functions
  (`supabase/migrations/0002_battle_rpc.sql`), not a service-role key in the app server.
  Correctness is always re-derived from the stored answer key inside the RPC — a client
  can never claim "I got it right."
- **Groq** (Llama 3.3 70B, free tier) for quest generation + the Sage's Socratic
  dialogue, with an automatic fallback chain (Groq → OpenRouter → Anthropic → a local
  deterministic heuristic) — the app stays fully playable with zero API keys configured.
- **unpdf** for serverless-safe PDF text extraction (lecture PDF upload).
- **Framer Motion** for the battle animations.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL/anon key at minimum
npm run dev
```

The app degrades gracefully without `GROQ_API_KEY` (quest generation falls back to a
local heuristic quiz generator) but plays much better with one — it's free, see
[console.groq.com/keys](https://console.groq.com/keys).

## Database

Schema + RLS policies: `supabase/migrations/0001_init.sql`
Battle RPCs (`start_quest_attempt`, `submit_answer`, `finish_quest_attempt`): `supabase/migrations/0002_battle_rpc.sql`

Every table has row-level security enabled; `quest_attempts`/`question_attempts`/
`concept_mastery` have **no** insert/update policy for `authenticated` at all — writes
only happen inside the `SECURITY DEFINER` RPCs after the function validates
`auth.uid()` against the row owner. `profiles.xp/level/streak_count` are protected by a
`BEFORE UPDATE` trigger so a direct REST `PATCH` (the anon key is public in the bundle)
cannot forge XP even though it returns 200.
