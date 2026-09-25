import { NextResponse } from "next/server";
import { db, type ServerCategory } from "@/lib/server-db";

export async function GET() {
  const active = db.categories.filter((c) => !c.deleted);
  return NextResponse.json(active);
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    const newId = db.categories.length > 0 ? Math.max(...db.categories.map((c) => c.id)) + 1 : 1;
    const cat: ServerCategory = {
      id: newId,
      name: name.trim(),
      deleted: false,
      creationDate: new Date().toISOString(),
    };

    db.categories.push(cat);
    return NextResponse.json(cat);
  } catch {
    return NextResponse.json({ message: "Failed to create category" }, { status: 400 });
  }
}
