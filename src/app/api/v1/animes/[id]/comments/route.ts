import { NextResponse } from "next/server";
import { db, getUserFromToken, type ServerComment } from "@/lib/server-db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const animeId = Number(id);
  const comments = db.comments.filter((c) => c.animeId === animeId && !c.deleted);
  return NextResponse.json(comments);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const animeId = Number(id);
    const authHeader = req.headers.get("Authorization");
    const user = getUserFromToken(authHeader) ?? db.users[0];
    const { description } = await req.json();

    if (!description?.trim()) {
      return NextResponse.json({ message: "Description required" }, { status: 400 });
    }

    const newId = db.comments.length > 0 ? Math.max(...db.comments.map((c) => c.id)) + 1 : 1;
    const comment: ServerComment = {
      id: newId,
      animeId,
      description: description.trim(),
      creationDate: new Date().toISOString(),
      deleted: false,
      creatorUserId: user.id,
      authorName: user.displayName,
      authorRole: user.role,
    };

    db.comments.unshift(comment);
    return NextResponse.json(comment);
  } catch {
    return NextResponse.json({ message: "Failed to post comment" }, { status: 400 });
  }
}
