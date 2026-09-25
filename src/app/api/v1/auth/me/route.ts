import { NextResponse } from "next/server";
import { getUserFromToken, db } from "@/lib/server-db";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const user = getUserFromToken(authHeader) ?? db.users[0];

  return NextResponse.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: user.emailVerified,
  });
}
