import { NextResponse } from "next/server";
import { db, getUserFromToken, type ServerWatchEvent } from "@/lib/server-db";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const user = getUserFromToken(authHeader);
    const body = await req.json();

    const newId = db.watchEvents.length + 1;
    const event: ServerWatchEvent = {
      id: newId,
      user: user?.email || "anonymous@anifire.tv",
      animeKey: String(body.animeKey || ""),
      animeTitle: body.animeTitle || "Unknown Anime",
      episode: Number(body.episode || 1),
      provider: body.provider || null,
      watchedAt: new Date().toISOString(),
    };

    db.watchEvents.unshift(event);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
