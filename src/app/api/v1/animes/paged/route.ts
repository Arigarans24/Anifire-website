import { NextResponse } from "next/server";
import { db } from "@/lib/server-db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10));
  const size = Math.max(1, parseInt(searchParams.get("size") || "12", 10));
  const search = (searchParams.get("search") || "").toLowerCase().trim();
  const categoryId = searchParams.get("categoryId")
    ? parseInt(searchParams.get("categoryId")!, 10)
    : null;

  let filtered = db.animes.filter((a) => !a.deleted);

  if (search) {
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(search) ||
        a.synopsis.toLowerCase().includes(search)
    );
  }

  if (categoryId) {
    filtered = filtered.filter((a) =>
      a.categories.some((c) => c.id === categoryId)
    );
  }

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size) || 1;
  const start = page * size;
  const items = filtered.slice(start, start + size);

  return NextResponse.json({
    items,
    page,
    size,
    totalItems,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
  });
}
