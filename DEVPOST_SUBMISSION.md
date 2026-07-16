# Devpost submission draft — Socratiq

Copy/paste ready for build-beyond-hackathon.devpost.com. Written in English (submission language).

---

## Project name
**Socratiq**

## Tagline
Don't just answer. Understand.

## Inspiration

Every AI study tool we tried does the same thing: you ask a question, it gives you the
answer. That feels productive, but it isn't how learning actually works — being told an
answer is not the same as earning it. The Socratic method has survived 2,400 years
because *guided struggle* is what makes an idea stick, not a clean explanation. We
wanted to build the AI study tool that refuses to just tell you — one that fights back a
little, the way a good tutor does.

## What it does

Socratiq turns any study material — a topic, pasted notes, or a lecture PDF — into an
adaptive **boss battle** quiz against a "knowledge golem." Answer correctly and you
crack its crystal armor. Answer incorrectly, and instead of revealing the answer,
**the Sage** — an AI mentor — asks a short, guiding question that nudges you toward
reasoning it out yourself. You can keep talking to the Sage, or ask it to just reveal
the answer if you're truly stuck.

Every run earns XP and builds a streak. Behind the scenes, Socratiq tracks your mastery
per concept using a real spaced-repetition algorithm (SM-2) and surfaces what you're
about to forget on your dashboard — so review happens automatically, right when it's
most effective, not when you remember to do it.

## How we built it

- **Next.js 16** (App Router, Route Handlers, Server Actions) + TypeScript + Tailwind v4,
  deployed on Vercel.
- **Supabase** (Postgres + Auth) for accounts and game state. The interesting part: every
  write that affects XP, streak, or boss HP goes through a `SECURITY DEFINER` Postgres
  RPC function, not application code with elevated privileges. Grading is *always*
  re-derived server-side from the stored answer key — the client only ever says "I
  picked option B," never "I got it right." We adversarially tested this: a forged
  direct REST `PATCH` to set our own XP to 999999 returns `200 OK` but silently changes
  nothing, because a `BEFORE UPDATE` trigger reverts protected columns unless the write
  came from the trusted RPC path.
- **Groq** (Llama 3.3 70B, free tier) generates the quest questions and powers the
  Sage's Socratic dialogue, through a fallback chain (Groq → OpenRouter → Anthropic → a
  deterministic local heuristic quiz generator) so the app is never fully broken even
  with zero API keys configured.
- **unpdf** for serverless-safe PDF text extraction when a student uploads lecture notes.
- **Framer Motion** for the boss-crack animation and battle transitions.

## Challenges we ran into

- **Making "don't reveal the answer" actually mean something.** It's easy for an LLM to
  cave and blurt the answer on the first hint. We had to write a tight system prompt for
  the Sage (one short guiding question, escalate only if the student is clearly stuck)
  and keep the correct answer server-side, never sent to the client until after grading.
- **Every game-state write is a potential cheat vector.** Boss HP, XP, and streaks all
  live in the database behind a public anon key. We designed around that from the start:
  no table lets a client directly write XP/streak/attempts — only `SECURITY DEFINER` RPCs
  that re-validate ownership and re-grade from the source of truth.
- **The "last question, wrong answer" edge case.** Our first pass only ended a battle
  when the boss's HP hit zero — which never happens if the player misses even one
  question, since damage only ever comes from correct answers. Fixed by completing the
  attempt when either the boss is defeated *or* every question has been attempted.

## Accomplishments we're proud of

A full loop — auth, AI-generated content, a graded game with anti-cheat by design, and
real spaced-repetition scheduling — running end-to-end on a live deployment, not just a
local demo.

## What's next for Socratiq

- Multiplayer "raid" battles where a study group fights the same boss together.
- Deck sharing, so a well-made quest can be reused by an entire class.
- Voice mode for the Sage's Socratic dialogue.

## Built with
Next.js, TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Row-Level Security, PL/pgSQL),
Groq (Llama 3.3 70B), Framer Motion, unpdf, Vercel

## Try it live
https://socratiq-tau.vercel.app

## Source code
https://github.com/ibcorreaai-oss/socratiq
