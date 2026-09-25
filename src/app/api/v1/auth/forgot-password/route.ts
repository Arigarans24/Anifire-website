import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Password reset link sent if account exists." });
}
