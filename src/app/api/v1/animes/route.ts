import { NextResponse } from "next/server";
import { db, getUserFromToken, type ServerAnime } from "@/lib/server-db";

export async function GET() {
  const active = db.animes.filter((a) => !a.deleted);
  return NextResponse.json(active);
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    const user = getUserFromToken(authHeader) ?? db.users[0];
    const body = await req.json();

    const newId = db.animes.length > 0 ? Math.max(...db.animes.map((a) => a.id)) + 1 : 1;
    const assignedCategories = (body.categoryIds || [])
      .map((catId: number) => db.categories.find((c) => c.id === catId))
      .filter(Boolean);

    const newAnime: ServerAnime = {
      id: newId,
      malId: body.malId || 0,
      title: body.title || "Untitled Anime",
      synopsis: body.description || "",
      imageUrl: body.imageUrl || "/hero-1.png",
      rating: body.rating ?? null,
      deleted: false,
      creationDate: new Date().toISOString(),
      creatorUserId: user.id,
      categories: assignedCategories,
    };

    db.animes.unshift(newAnime);
    return NextResponse.json(newAnime);
  } catch {
    return NextResponse.json({ message: "Failed to create anime" }, { status: 400 });
  }
}
