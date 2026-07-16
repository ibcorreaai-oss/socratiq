"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { FileText, Type, Upload, Loader2, Swords } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "text" | "topic" | "pdf";

export default function NewQuestPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("topic");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let res: Response;
      if (mode === "pdf") {
        if (!file) throw new Error("Choose a PDF first.");
        const fd = new FormData();
        fd.set("file", file);
        fd.set("topicHint", topic);
        res = await fetch("/api/quests/upload", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/quests/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sourceType: mode,
            content: mode === "topic" ? topic : text,
            topicHint: mode === "text" ? topic : undefined,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.push(`/quest/${data.questId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    ((mode === "topic" && topic.trim().length > 2) ||
      (mode === "text" && text.trim().length > 20) ||
      (mode === "pdf" && !!file));

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="font-display text-2xl font-semibold">Summon a new quest</h1>
      <p className="mt-1 text-muted">Give the Sage something to forge a boss from.</p>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <ModeTab icon={<Type className="size-4" />} label="Topic" active={mode === "topic"} onClick={() => setMode("topic")} />
        <ModeTab icon={<FileText className="size-4" />} label="Paste text" active={mode === "text"} onClick={() => setMode("text")} />
        <ModeTab icon={<Upload className="size-4" />} label="Upload PDF" active={mode === "pdf"} onClick={() => setMode("pdf")} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "topic" && "What do you want to master?"}
            {mode === "text" && "Paste your notes, article, or slides"}
            {mode === "pdf" && "Upload a lecture PDF"}
          </CardTitle>
          <CardDescription>
            {mode === "topic" && "A subject, a chapter, a skill — the Sage will draft the quest from its own knowledge."}
            {mode === "text" && "The Sage reads it, extracts the core concepts, and builds escalating questions from it."}
            {mode === "pdf" && "Max 4MB. Text-based PDFs only — scanned images can't be read yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "topic" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g. The French Revolution, Photosynthesis, Big-O notation…"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {mode === "text" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="text">Content</Label>
                  <Textarea
                    id="text"
                    className="min-h-56"
                    placeholder="Paste your notes here…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topicHint">Focus (optional)</Label>
                  <Input
                    id="topicHint"
                    placeholder="Tell the Sage what to emphasize…"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
              </>
            )}

            {mode === "pdf" && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-background/40 px-4 py-10 text-center hover:bg-white/5"
                >
                  <Upload className="size-6 text-muted" />
                  <span className="text-sm">{file ? file.name : "Click to choose a PDF"}</span>
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" size="lg" disabled={!canSubmit} className="mt-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Forging your boss…
                </>
              ) : (
                <>
                  <Swords className="size-4" /> Summon boss
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ModeTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary/50 bg-primary/15 text-foreground"
          : "border-border bg-background-elevated/40 text-muted hover:bg-white/5"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
