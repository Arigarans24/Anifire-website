import { NextResponse } from "next/server";
import { db } from "@/lib/server-db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const anime = db.animes.find((a) => a.id === Number(id) && !a.deleted);
  if (!anime) {
    return NextResponse.json({ message: "Anime not found" }, { status: 404 });
  }
  return NextResponse.json(anime);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const index = db.animes.findIndex((a) => a.id === Number(id));
    if (index === -1) {
      return NextResponse.json({ message: "Anime not found" }, { status: 404 });
    }

    const assignedCategories = (body.categoryIds || [])
      .map((catId: number) => db.categories.find((c) => c.id === catId))
      .filter(Boolean);

    db.animes[index] = {
      ...db.animes[index],
      title: body.title !== undefined ? body.title : db.animes[index].title,
      synopsis: body.description !== undefined ? body.description : db.animes[index].synopsis,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : db.animes[index].imageUrl,
      rating: body.rating !== undefined ? body.rating : db.animes[index].rating,
      categories: assignedCategories.length > 0 ? assignedCategories : db.animes[index].categories,
    };

    return NextResponse.json(db.animes[index]);
  } catch {
    return NextResponse.json({ message: "Failed to update anime" }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const anime = db.animes.find((a) => a.id === Number(id));
  if (anime) {
    anime.deleted = true;
  }
  return NextResponse.json({ message: "Anime deleted successfully." });
}
