import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createQuestFromContent } from "@/lib/quest-service";

// PDFs are received here (never as a Server Action argument — the React Flight
// serializer chokes on large base64 payloads with "Maximum array nesting level
// exceeded" long before any application code runs). Capped at 4MB to stay under
// Vercel's serverless Route Handler body limit (~4.5MB). See
// ref_checklist_antirretrabalho_apps.md.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength && contentLength > MAX_BYTES) {
    return NextResponse.json({ error: "PDF is too large — max 4MB." }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const topicHint = String(formData.get("topicHint") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF is too large — max 4MB." }, { status: 413 });
  }

  try {
    // unpdf — a serverless/edge-safe build of pdf.js. `pdf-parse`/`pdfjs-dist` are known
    // to break on Vercel's lambda runtime despite working locally.
    const { extractText, getDocumentProxy } = await import("unpdf");
    const buf = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: "Couldn't read any text from that PDF — is it a scanned image?" },
        { status: 422 }
      );
    }

    const { questId } = await createQuestFromContent(supabase, user.id, {
      sourceType: "pdf",
      content: text,
      topicHint: topicHint || undefined,
    });
    return NextResponse.json({ questId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process PDF." },
      { status: 500 }
    );
  }
}
