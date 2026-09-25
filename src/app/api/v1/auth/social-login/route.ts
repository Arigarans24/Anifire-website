import { NextResponse } from "next/server";
import { db, createSessionToken } from "@/lib/server-db";

export async function POST(req: Request) {
  try {
    const { provider } = await req.json();
    const email = `${provider ?? "social"}@anifire.tv`;
    let user = db.users.find((u) => u.email === email);

    if (!user) {
      const newId = db.users.length + 1;
      const name = `${(provider || "social").toUpperCase()} Explorer`;
      user = {
        id: newId,
        email,
        displayName: name,
        role: "USER",
        emailVerified: true,
      };
      db.users.push(user);
      db.profiles.set(newId, {
        id: newId,
        email,
        displayName: name,
        role: "USER",
        emailVerified: true,
        bio: `Connected with ${provider}.`,
        location: null,
        birthday: null,
        avatarUrl: "/hero-3.png",
        bannerUrl: "/hero-1.png",
        level: 5,
        points: 250,
        profileViews: 10,
        likes: 5,
        friends: 2,
        posts: 0,
        commentsCount: 2,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    }

    const token = createSessionToken(user.id);
    const response = NextResponse.json({
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

    response.cookies.set("anifire_csrf", "csrf_" + Math.random().toString(36).slice(2), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json({ message: "Social login failed" }, { status: 400 });
  }
}
