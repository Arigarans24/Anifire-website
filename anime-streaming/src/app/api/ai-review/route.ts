import { NextResponse } from "next/server";

// Generates a short anime review locally via Ollama. Used as an optional
// "let the AI rate this for you" helper in the comments box.
export const runtime = "nodejs";
export const maxDuration = 120;

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_REVIEW_MODEL ?? "qwen2.5:3b";

export async function POST(request: Request) {
  let body: { title?: string; synopsis?: string; lang?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ review: null }, { status: 400 });
  }

  const title = (body.title ?? "").slice(0, 200);
  const synopsis = (body.synopsis ?? "").slice(0, 1500);
  const lang = body.lang === "en" ? "English" : "Russian";
  if (!title) return NextResponse.json({ review: null }, { status: 400 });

  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0.8 },
        messages: [
          {
            role: "system",
            content:
              `You are an anime fan writing a short, lively viewer review in ${lang}. ` +
              `2-3 sentences, personal and specific, plus a score out of 10. ` +
              `Return ONLY JSON: {"score": <1-10 number>, "review": "<text in ${lang}>"}.`,
          },
          {
            role: "user",
            content: `Title: ${title}\nSynopsis: ${synopsis || "(unknown)"}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = (await res.json()) as { message?: { content?: string } };
    const parsed = JSON.parse(data.message?.content ?? "{}") as {
      score?: number;
      review?: string;
    };
    if (!parsed.review) return NextResponse.json({ review: null });

    const score =
      typeof parsed.score === "number"
        ? Math.max(1, Math.min(10, Math.round(parsed.score)))
        : null;
    const text = score ? `${parsed.review.trim()} — ${score}/10` : parsed.review.trim();
    return NextResponse.json({ review: text, score });
  } catch {
    return NextResponse.json({ review: null });
  }
}
