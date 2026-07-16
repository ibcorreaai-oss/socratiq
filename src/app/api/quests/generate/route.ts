import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createQuestFromContent } from "@/lib/quest-service";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { sourceType?: string; content?: string; topicHint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sourceType = body.sourceType === "topic" ? "topic" : "text";
  const content = String(body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "Content is required." }, { status: 400 });
  if (content.length > 20000) {
    return NextResponse.json({ error: "That's a lot of material — trim it to under ~20,000 characters." }, { status: 400 });
  }

  try {
    const { questId } = await createQuestFromContent(supabase, user.id, {
      sourceType,
      content,
      topicHint: body.topicHint,
    });
    return NextResponse.json({ questId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to forge quest." }, { status: 500 });
  }
}
