import { NextResponse } from "next/server";
import { db } from "@/lib/server-db";

export async function GET() {
  const users = db.users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    emailVerified: u.emailVerified,
  }));
  return NextResponse.json(users);
}
