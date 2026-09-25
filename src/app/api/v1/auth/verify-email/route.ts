import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Email has been verified successfully." });
}
