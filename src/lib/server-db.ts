export interface ServerUser {
  id: number;
  email: string;
  password?: string;
  displayName: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
}

export interface ServerProfile {
  id: number;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
  bio: string | null;
  location: string | null;
  birthday: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  level: number;
  points: number;
  profileViews: number;
  likes: number;
  friends: number;
  posts: number;
  commentsCount: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface ServerAnime {
  id: number;
  malId: number;
  title: string;
  synopsis: string;
  imageUrl: string;
  rating: number | null;
  deleted: boolean;
  creationDate: string;
  creatorUserId: number | null;
  categories: { id: number; name: string; deleted: boolean; creationDate: string }[];
}

export interface ServerCategory {
  id: number;
  name: string;
  deleted: boolean;
  creationDate: string;
}

export interface ServerComment {
  id: number;
  animeId: number;
  description: string;
  creationDate: string;
  deleted: boolean;
  creatorUserId: number | null;
  authorName: string;
  authorRole: string;
}

export interface ServerWatchEvent {
  id: number;
  user: string;
  animeKey: string;
  animeTitle: string;
  episode: number;
  provider: string | null;
  watchedAt: string;
}

// In-memory persistent state on globalThis across Next.js dev HMR reloads
const globalStore = globalThis as unknown as {
  __anifire_db?: {
    users: ServerUser[];
    profiles: Map<number, ServerProfile>;
    categories: ServerCategory[];
    animes: ServerAnime[];
    comments: ServerComment[];
    watchEvents: ServerWatchEvent[];
    sessions: Map<string, { userId: number; expiresAt: number }>;
  };
};

if (!globalStore.__anifire_db) {
  const initialCategories: ServerCategory[] = [
    { id: 1, name: "Action", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 2, name: "Shounen", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 3, name: "Fantasy", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 4, name: "Dark Fantasy", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 5, name: "Drama", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 6, name: "Sci-Fi", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 7, name: "Mystery", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 8, name: "Mecha", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 9, name: "Psychological", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 10, name: "Horror", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
    { id: 11, name: "Supernatural", deleted: false, creationDate: "2024-01-01T00:00:00Z" },
  ];

  const initialUsers: ServerUser[] = [
    {
      id: 1,
      email: "admin@anifire.tv",
      password: "password1234",
      displayName: "Anifire Admin",
      role: "ADMIN",
      emailVerified: true,
    },
    {
      id: 2,
      email: "user@anifire.tv",
      password: "password1234",
      displayName: "Otaku Prime",
      role: "USER",
      emailVerified: true,
    },
  ];

  const initialProfiles = new Map<number, ServerProfile>([
    [
      1,
      {
        id: 1,
        email: "admin@anifire.tv",
        displayName: "Anifire Admin",
        role: "ADMIN",
        emailVerified: true,
        bio: "Curator & System Administrator at Anifire.",
        location: "Tokyo, Japan",
        birthday: "1998-05-12",
        avatarUrl: "/hero-2.png",
        bannerUrl: "/hero-1.png",
        level: 42,
        points: 8400,
        profileViews: 1240,
        likes: 580,
        friends: 64,
        posts: 28,
        commentsCount: 95,
        createdAt: "2024-01-01T12:00:00Z",
        lastLoginAt: new Date().toISOString(),
      },
    ],
    [
      2,
      {
        id: 2,
        email: "user@anifire.tv",
        displayName: "Otaku Prime",
        role: "USER",
        emailVerified: true,
        bio: "Anime enthusiast, binge watcher, and shounen lover.",
        location: "Shibuya",
        birthday: "2001-08-24",
        avatarUrl: "/hero-3.png",
        bannerUrl: "/hero-2.png",
        level: 15,
        points: 2150,
        profileViews: 320,
        likes: 145,
        friends: 22,
        posts: 8,
        commentsCount: 34,
        createdAt: "2024-03-15T09:30:00Z",
        lastLoginAt: new Date().toISOString(),
      },
    ],
  ]);

  const initialAnimes: ServerAnime[] = [
    {
      id: 1,
      malId: 52991, // Frieren: Beyond Journey's End
      title: "Shadow Duel",
      synopsis:
        "Two warriors with opposing powers clash in a final battle under the rain. Darkness and light intertwine in a fight that will decide the fate of the world.",
      imageUrl: "/hero-1.png",
      rating: 9.8,
      deleted: false,
      creationDate: "2024-01-10T00:00:00Z",
      creatorUserId: 1,
      categories: [initialCategories[0], initialCategories[1]],
    },
    {
      id: 2,
      malId: 38000, // Demon Slayer
      title: "Fire Blade",
      synopsis:
        "A young swordsman masters the forbidden technique of fire breathing. Now his blade burns, and his enemies tremble before the power of the flame.",
      imageUrl: "/hero-2.png",
      rating: 9.5,
      deleted: false,
      creationDate: "2024-01-11T00:00:00Z",
      creatorUserId: 1,
      categories: [initialCategories[2], initialCategories[0]],
    },
    {
      id: 3,
      malId: 16498, // Attack on Titan
      title: "Wall Breaker",
      synopsis:
        "Humanity sheltered behind walls from giant creatures. But the walls are crumbling, and the last hope is a squad of fearless scouts.",
      imageUrl: "/hero-3.png",
      rating: 9.7,
      deleted: false,
      creationDate: "2024-01-12T00:00:00Z",
      creatorUserId: 1,
      categories: [initialCategories[3], initialCategories[4]],
    },
    {
      id: 4,
      malId: 5114, // Fullmetal Alchemist: Brotherhood
      title: "Crimson Rain",
      synopsis:
        "After the catastrophe the world fell into darkness. The only ray of light is a girl with an ancient power able to stop the endless rain.",
      imageUrl: "/hero-1.png",
      rating: 9.2,
      deleted: false,
      creationDate: "2024-01-13T00:00:00Z",
      creatorUserId: 1,
      categories: [initialCategories[5], initialCategories[6]],
    },
    {
      id: 5,
      malId: 30, // Evangelion
      title: "Neon Genesis",
      synopsis:
        "In a near future the world stands on the brink of destruction. Teenagers pilot giant mechs in a war against the angels.",
      imageUrl: "/hero-3.png",
      rating: 9.0,
      deleted: false,
      creationDate: "2024-01-14T00:00:00Z",
      creatorUserId: 1,
      categories: [initialCategories[7], initialCategories[8]],
    },
    {
      id: 6,
      malId: 40748, // Jujutsu Kaisen
      title: "Dark Hunter",
      synopsis:
        "A demon hunter roams cursed lands in search of the last artifact. Every night brings new horrors and tougher prey.",
      imageUrl: "/hero-2.png",
      rating: 8.8,
      deleted: false,
      creationDate: "2024-01-15T00:00:00Z",
      creatorUserId: 1,
      categories: [initialCategories[9], initialCategories[10]],
    },
  ];

  const initialComments: ServerComment[] = [
    {
      id: 1,
      animeId: 1,
      description: "The animation during the climax was breathtaking! 10/10 masterpiece.",
      creationDate: new Date(Date.now() - 3600000 * 2).toISOString(),
      deleted: false,
      creatorUserId: 1,
      authorName: "Anifire Admin",
      authorRole: "ADMIN",
    },
    {
      id: 2,
      animeId: 1,
      description: "Can't wait for episode 2! The music gave me chills.",
      creationDate: new Date(Date.now() - 3600000 * 5).toISOString(),
      deleted: false,
      creatorUserId: 2,
      authorName: "Otaku Prime",
      authorRole: "USER",
    },
  ];

  const initialWatchEvents: ServerWatchEvent[] = [
    {
      id: 1,
      user: "admin@anifire.tv",
      animeKey: "1",
      animeTitle: "Shadow Duel",
      episode: 1,
      provider: "AniLiberty",
      watchedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 2,
      user: "user@anifire.tv",
      animeKey: "2",
      animeTitle: "Fire Blade",
      episode: 3,
      provider: "HLS",
      watchedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
  ];

  globalStore.__anifire_db = {
    users: initialUsers,
    profiles: initialProfiles,
    categories: initialCategories,
    animes: initialAnimes,
    comments: initialComments,
    watchEvents: initialWatchEvents,
    sessions: new Map(),
  };
}

export const db = globalStore.__anifire_db;

export function getUserFromToken(token: string | null): ServerUser | null {
  if (!token) return null;
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  const session = db.sessions.get(clean);
  if (session && session.expiresAt > Date.now()) {
    return db.users.find((u) => u.id === session.userId) ?? null;
  }
  // Also support simple numeric userId or admin token
  if (clean === "admin-demo-token") {
    return db.users.find((u) => u.role === "ADMIN") ?? null;
  }
  return null;
}

export function createSessionToken(userId: number): string {
  const token = `tok_${userId}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  db.sessions.set(token, {
    userId,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}
