import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getUserContext } from "@/lib/supabase/server";

export default async function Home() {
  const ctx = await getUserContext();
  const primaryHref = ctx ? "/dashboard" : "/signup";

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-wide">
          <Image src="/logo-mark.png" alt="" width={32} height={32} className="rounded-lg" />
          Socratiq
        </Link>
        <nav className="flex items-center gap-3">
          {ctx ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="primary" size="sm">
                <Link href="/signup">Start a quest — free</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-6 pb-10 pt-10 text-center md:pt-16">
        <Badge variant="gold">Built for the Build Beyond Hackathon</Badge>
        <h1 className="text-shimmer max-w-3xl font-display text-4xl font-semibold leading-tight md:text-6xl">
          Don&apos;t just answer. Understand.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Paste your notes, a topic, or a lecture PDF. Socratiq turns it into a boss battle —
          and when you get something wrong, <span className="text-foreground">the Sage</span>{" "}
          won&apos;t hand you the answer. It asks the question that gets you there yourself.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="primary">
            <Link href={primaryHref}>Summon your first boss</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </div>

        <div className="relative mt-6 w-full max-w-4xl overflow-hidden rounded-2xl rune-border">
          <Image
            src="/hero-illustration.png"
            alt="The Sage, a constellation owl, facing a cracking crystal knowledge golem"
            width={1600}
            height={900}
            priority
            className="w-full"
          />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-20 md:grid-cols-3">
        <FeatureCard
          badge="1 · Summon"
          title="Any material becomes a quest"
          description="Paste text, drop in a topic, or upload a lecture PDF. Socratiq reads it and forges a knowledge boss with questions that escalate from recall to true mastery."
        />
        <FeatureCard
          badge="2 · Battle"
          title="Fight with your brain, not your memory"
          description="Every correct answer cracks the boss's crystal armor. Get one wrong, and instead of a red X, the Sage asks a guiding question — Socratic method, not spoon-feeding."
        />
        <FeatureCard
          badge="3 · Retain"
          title="Spaced repetition, automatically"
          description="Socratiq tracks your mastery per concept and quietly resurfaces what you're about to forget — right before you forget it, based on real spaced-repetition science."
        />
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <Card className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <CardHeader className="p-0">
              <CardTitle className="text-2xl">Why Socratic, not just AI flashcards?</CardTitle>
              <CardDescription className="mt-2 text-base">
                Being told an answer feels like progress but rarely sticks. Being guided to find
                it yourself is slower — and it&apos;s the difference between recognizing a fact and
                actually owning it. Socratiq is built entirely around that one idea.
              </CardDescription>
            </CardHeader>
          </div>
          <CardContent className="p-0">
            <Button asChild size="lg" variant="gold">
              <Link href={primaryHref}>Try it free</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-10 text-sm text-muted">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 md:flex-row">
          <p>Built by Cortex Tech for the Build Beyond Hackathon.</p>
          <p>© {new Date().getFullYear()} Socratiq</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  badge,
  title,
  description,
}: {
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <Badge variant="muted" className="w-fit">
          {badge}
        </Badge>
        <CardTitle className="mt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
