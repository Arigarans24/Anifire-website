import { NextResponse } from "next/server";
import { db } from "@/lib/server-db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comment = db.comments.find((c) => c.id === Number(id));
  if (!comment) {
    return NextResponse.json({ message: "Comment not found" }, { status: 404 });
  }

  const { description } = await req.json();
  if (description) comment.description = description;

  return NextResponse.json(comment);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const comment = db.comments.find((c) => c.id === Number(id));
  if (comment) {
    comment.deleted = true;
  }
  return NextResponse.json({ message: "Comment deleted" });
}
