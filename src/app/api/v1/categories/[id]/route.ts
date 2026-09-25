import { NextResponse } from "next/server";
import { db } from "@/lib/server-db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cat = db.categories.find((c) => c.id === Number(id));
  if (!cat) {
    return NextResponse.json({ message: "Category not found" }, { status: 404 });
  }

  const { name } = await req.json();
  if (name?.trim()) cat.name = name.trim();

  return NextResponse.json(cat);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cat = db.categories.find((c) => c.id === Number(id));
  if (cat) {
    cat.deleted = true;
  }
  return NextResponse.json({ message: "Category deleted" });
}
