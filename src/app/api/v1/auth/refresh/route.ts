import { NextResponse } from "next/server";
import { db, createSessionToken } from "@/lib/server-db";

export async function POST() {
  const user = db.users[0]; // refresh to primary session or admin
  const token = createSessionToken(user.id);
  return NextResponse.json({
    accessToken: token,
    tokenType: "Bearer",
    expiresIn: 3600,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  });
}
