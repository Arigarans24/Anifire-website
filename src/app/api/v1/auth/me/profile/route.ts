import { NextResponse } from "next/server";
import { getUserFromToken, db, type ServerProfile } from "@/lib/server-db";

export async function GET(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const user = getUserFromToken(authHeader) ?? db.users[0];
  const profile = db.profiles.get(user.id) ?? {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    emailVerified: user.emailVerified,
    bio: "Passionate anime viewer.",
    location: "Tokyo, Japan",
    birthday: "2000-01-01",
    avatarUrl: "/hero-2.png",
    bannerUrl: "/hero-1.png",
    level: 10,
    points: 1200,
    profileViews: 140,
    likes: 65,
    friends: 12,
    posts: 4,
    commentsCount: 16,
    createdAt: "2024-01-01T00:00:00Z",
    lastLoginAt: new Date().toISOString(),
  };

  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const user = getUserFromToken(authHeader) ?? db.users[0];
  const patch = await req.json();

  let profile = db.profiles.get(user.id);
  if (!profile) {
    profile = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      emailVerified: user.emailVerified,
      bio: null,
      location: null,
      birthday: null,
      avatarUrl: "/hero-2.png",
      bannerUrl: "/hero-1.png",
      level: 1,
      points: 100,
      profileViews: 10,
      likes: 5,
      friends: 0,
      posts: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  }

  const updated: ServerProfile = {
    ...profile,
    displayName: patch.displayName !== undefined ? patch.displayName : profile.displayName,
    bio: patch.bio !== undefined ? patch.bio : profile.bio,
    location: patch.location !== undefined ? patch.location : profile.location,
    birthday: patch.birthday !== undefined ? patch.birthday : profile.birthday,
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : profile.avatarUrl,
    bannerUrl: patch.bannerUrl !== undefined ? patch.bannerUrl : profile.bannerUrl,
  };

  db.profiles.set(user.id, updated);
  if (patch.displayName) {
    const u = db.users.find((x) => x.id === user.id);
    if (u) u.displayName = patch.displayName;
  }

  return NextResponse.json(updated);
}
