import { NextResponse } from "next/server";
import { db } from "@/lib/server-db";

export async function POST(req: Request) {
  try {
    const { email, password, displayName } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required", error: "bad_request" },
        { status: 400 }
      );
    }

    const existing = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        { message: "User already exists with this email", error: "conflict" },
        { status: 409 }
      );
    }

    const newId = db.users.length + 1;
    const name = displayName?.trim() || email.split("@")[0];
    const newUser = {
      id: newId,
      email,
      password,
      displayName: name,
      role: "USER" as const,
      emailVerified: true,
    };

    db.users.push(newUser);
    db.profiles.set(newId, {
      id: newId,
      email,
      displayName: name,
      role: "USER",
      emailVerified: true,
      bio: "New Anifire member ready to explore anime.",
      location: null,
      birthday: null,
      avatarUrl: "/hero-1.png",
      bannerUrl: "/hero-2.png",
      level: 1,
      points: 50,
      profileViews: 1,
      likes: 0,
      friends: 0,
      posts: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "Account created successfully.",
    });
  } catch {
    return NextResponse.json({ message: "Registration failed" }, { status: 400 });
  }
}
