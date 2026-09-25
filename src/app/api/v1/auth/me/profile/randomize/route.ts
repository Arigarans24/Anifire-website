import { NextResponse } from "next/server";
import { getUserFromToken, db, type ServerProfile } from "@/lib/server-db";

const RANDOM_NAMES = ["Kira", "Rin", "Shinji", "Asuka", "Levi", "Mikasa", "Tanjiro", "Nezuko"];
const RANDOM_BIOS = [
  "Binge-watching the current seasonal hits.",
  "Collecting manga and hunting for rare soundtracks.",
  "Nothing beats classic 90s mecha vibes.",
  "Streaming in HD with the ultimate surround sound.",
];
const RANDOM_AVATARS = ["/hero-1.png", "/hero-2.png", "/hero-3.png"];

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const user = getUserFromToken(authHeader) ?? db.users[0];

  const profile = db.profiles.get(user.id);
  const randName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const randBio = RANDOM_BIOS[Math.floor(Math.random() * RANDOM_BIOS.length)];
  const randAvatar = RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
  const randBanner = RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];

  const updated: ServerProfile = {
    id: user.id,
    email: user.email,
    displayName: `${randName} #${Math.floor(Math.random() * 900 + 100)}`,
    role: user.role,
    emailVerified: user.emailVerified,
    bio: randBio,
    location: "Tokyo, JP",
    birthday: profile?.birthday ?? "2002-04-18",
    avatarUrl: randAvatar,
    bannerUrl: randBanner,
    level: Math.floor(Math.random() * 30 + 1),
    points: Math.floor(Math.random() * 5000 + 500),
    profileViews: Math.floor(Math.random() * 1000 + 50),
    likes: Math.floor(Math.random() * 300 + 10),
    friends: Math.floor(Math.random() * 50 + 2),
    posts: Math.floor(Math.random() * 20),
    commentsCount: Math.floor(Math.random() * 40 + 5),
    createdAt: profile?.createdAt ?? new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  db.profiles.set(user.id, updated);
  const u = db.users.find((x) => x.id === user.id);
  if (u) u.displayName = updated.displayName;

  return NextResponse.json(updated);
}
