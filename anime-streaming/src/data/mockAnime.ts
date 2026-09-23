export interface Movie {
  id: number;
  malId?: number;
  title: string;
  description: string;
  year: string;
  rating: string;
  duration: string;
  genre: string;
  match: number;
  imageUrl: string;
  heroImageUrl: string;
  logoImageUrl?: string;
  tags: string[];
}

export const NAV_ITEMS = [
  { label: "Home", href: "/stream" },
  { label: "Genres", href: "#genres" },
  { label: "My List", href: "#my-list" },
];

export const MOCK_MOVIES: Movie[] = [
  {
    id: 1,
    title: "Shadow Duel",
    description:
      "Two warriors with opposing powers clash in a final battle under the rain. Darkness and light intertwine in a fight that will decide the fate of the world.",
    year: "2024",
    rating: "18+",
    duration: "24 min",
    genre: "Action • Shounen",
    match: 98,
    imageUrl: "/hero-1.png",
    heroImageUrl: "/hero-1.png",
    tags: ["Intense", "Supernatural", "Rivalry"],
  },
  {
    id: 2,
    title: "Fire Blade",
    description:
      "A young swordsman masters the forbidden technique of fire breathing. Now his blade burns, and his enemies tremble before the power of the flame.",
    year: "2023",
    rating: "16+",
    duration: "22 min",
    genre: "Fantasy • Action",
    match: 95,
    imageUrl: "/hero-2.png",
    heroImageUrl: "/hero-2.png",
    tags: ["Epic", "Samurai", "Fantasy"],
  },
  {
    id: 3,
    title: "Wall Breaker",
    description:
      "Humanity sheltered behind walls from giant creatures. But the walls are crumbling, and the last hope is a squad of fearless scouts.",
    year: "2013",
    rating: "18+",
    duration: "24 min",
    genre: "Dark Fantasy • Drama",
    match: 97,
    imageUrl: "/hero-3.png",
    heroImageUrl: "/hero-3.png",
    tags: ["Dark", "Survival", "Drama"],
  },
  {
    id: 4,
    title: "Crimson Rain",
    description:
      "After the catastrophe the world fell into darkness. The only ray of light is a girl with an ancient power able to stop the endless rain.",
    year: "2025",
    rating: "16+",
    duration: "23 min",
    genre: "Sci-Fi • Mystery",
    match: 92,
    imageUrl: "/hero-1.png",
    heroImageUrl: "/hero-1.png",
    tags: ["Mystery", "Post-apocalyptic", "Powers"],
  },
  {
    id: 5,
    title: "Neon Genesis",
    description:
      "In a near future the world stands on the brink of destruction. Teenagers pilot giant mechs in a war against the angels.",
    year: "1995",
    rating: "16+",
    duration: "24 min",
    genre: "Mecha • Psychological",
    match: 90,
    imageUrl: "/hero-3.png",
    heroImageUrl: "/hero-3.png",
    tags: ["Mecha", "Psychological", "Classic"],
  },
  {
    id: 6,
    title: "Dark Hunter",
    description:
      "A demon hunter roams cursed lands in search of the last artifact. Every night brings new horrors and tougher prey.",
    year: "2024",
    rating: "18+",
    duration: "25 min",
    genre: "Horror • Supernatural",
    match: 88,
    imageUrl: "/hero-2.png",
    heroImageUrl: "/hero-2.png",
    tags: ["Horror", "Supernatural", "Action"],
  },
];

export interface Row {
  title: string;
  items: Movie[];
}

const byId = (...ids: number[]) =>
  ids.map((id) => MOCK_MOVIES.find((m) => m.id === id)!).filter(Boolean);

export const ROWS: Row[] = [
  { title: "Trending Now", items: MOCK_MOVIES },
  { title: "Action & Adventure", items: byId(1, 2, 6, 3, 4) },
  { title: "New Releases", items: byId(4, 1, 6, 2, 3) },
  { title: "Because You Watched Fire Blade", items: byId(2, 3, 5, 1, 6, 4) },
];
