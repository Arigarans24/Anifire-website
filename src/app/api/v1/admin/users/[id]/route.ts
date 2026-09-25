import { NextResponse } from "next/server";
import { db } from "@/lib/server-db";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = db.users.find((u) => u.id === Number(id));
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const patch = await req.json();
  if (patch.displayName !== undefined) user.displayName = patch.displayName;
  if (patch.email !== undefined) user.email = patch.email;
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.emailVerified !== undefined) user.emailVerified = patch.emailVerified;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: user.emailVerified,
  });
}
