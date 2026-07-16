import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Flame, LayoutDashboard, Plus, LogOut } from "lucide-react";
import { getUserContext } from "@/lib/supabase/server";
import { logOutAction } from "../(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { xpForNextLevel } from "@/lib/xp";

// Explicit, not just implied by cookies() usage: the XP/level/streak badge
// here comes from a `profiles` row that finish_quest_attempt mutates via a
// direct Supabase RPC call (not a Server Action/Route Handler), so Next.js
// has no revalidation signal for it. Without forcing this segment fully
// dynamic, the header kept rendering pre-battle XP/level across the
// quest -> results -> dashboard navigation chain even after a hard
// staleTimes:0 Router Cache setting — confirmed live by playing a quest,
// checking the DB had the new XP, and still seeing the old value on both
// the results page and dashboard until a full reload.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  const { profile } = ctx;
  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const streak = profile?.streak_count ?? 0;
  const { pct } = xpForNextLevel(xp, level);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-display text-base tracking-wide">
            <Image src="/logo-mark.png" alt="" width={28} height={28} className="rounded-lg" />
            Socratiq
          </Link>

          <div className="flex flex-1 items-center gap-4">
            <div className="hidden flex-1 items-center gap-2 sm:flex">
              <Badge variant="default" className="shrink-0">
                Lv {level}
              </Badge>
              <div className="h-2 w-full max-w-[10rem] overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <Badge variant="gold" className="flex items-center gap-1 shrink-0">
              <Flame className="size-3" /> {streak}
            </Badge>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-foreground sm:flex"
            >
              <LayoutDashboard className="size-4" /> Dashboard
            </Link>
            <Link
              href="/quest/new"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" /> New quest
            </Link>
            <form action={logOutAction}>
              <button
                type="submit"
                aria-label="Log out"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-white/5 hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
