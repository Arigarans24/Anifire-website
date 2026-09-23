"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Dices,
  Eye,
  Flag,
  Gem,
  Heart,
  Info,
  Loader2,
  MessageCircle,
  MessageSquare,
  Mic,
  Pencil,
  Send,
  Settings,
  Shield,
  Skull,
  Sword,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import StreamNav from "@/components/stream/StreamNav";
import StreamFooter from "@/components/stream/StreamFooter";
import RequireAuth from "@/components/auth/RequireAuth";
import {
  getProfile,
  randomizeProfile,
  updateProfile,
  type Profile,
} from "@/lib/auth-client";
import styles from "./profile.module.css";

const BADGES = [
  { label: "Anifire member", Icon: Trophy, c: "#f7c744" },
  { label: "Light side adept", Icon: Sword, c: "#7cc4ff" },
  { label: "Guardian", Icon: Shield, c: "#ff4d5a" },
];

const ACHIEVEMENTS = [
  { label: "Voice of community", grade: "F", Icon: Mic },
  { label: "Pages that wait", grade: "A", Icon: BookOpen },
  { label: "Page conqueror", grade: "E", Icon: Flag },
  { label: "Words that count", grade: "F", Icon: MessageCircle },
  { label: "Wonder collector", grade: "D", Icon: Gem },
  { label: "Not so smooth", grade: "F", Icon: Skull },
];

const TABS = ["Profile", "Bookmarks", "Subscription", "Inventory", "Social"];

const FALLBACK_AVATAR = "/hero-2.png";
const FALLBACK_BANNER = "/hero-1.png";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function joinedLabel(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

interface Comment {
  id: number;
  name: string;
  avatar: string;
  time: string;
  text: string;
}

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 1,
    name: "Kuro",
    avatar: "/hero-3.png",
    time: "2h ago",
    text: "Your taste in anime is impeccable. That watchlist is fire 🔥",
  },
  {
    id: 2,
    name: "Mira",
    avatar: "/hero-1.png",
    time: "Yesterday",
    text: "Welcome to Anifire! Hope you enjoy the new catalog view.",
  },
];

function ProfileContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [randomizing, setRandomizing] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  // Local-only image preview (file uploads aren't persisted server-side yet).
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [bannerOverride, setBannerOverride] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("Profile");

  const [editingInfo, setEditingInfo] = useState(false);
  const [infoDraft, setInfoDraft] = useState({ bio: "", location: "", birthday: "" });

  const [comments, setComments] = useState<Comment[]>(INITIAL_COMMENTS);
  const [commentText, setCommentText] = useState("");

  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getProfile().then((p) => {
      if (cancelled) return;
      setProfile(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !mainRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      mainRef.current.querySelectorAll("[data-rise]"),
      { y: 22, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: "power2.out" }
    );
  }, [loading]);

  function pickImage(
    e: React.ChangeEvent<HTMLInputElement>,
    set: (v: string) => void
  ) {
    const file = e.target.files?.[0];
    if (file) set(URL.createObjectURL(file));
  }

  const name =
    profile?.displayName || profile?.email?.split("@")[0] || "Anifire user";
  const avatar = avatarOverride || profile?.avatarUrl || FALLBACK_AVATAR;
  const banner = bannerOverride || profile?.bannerUrl || FALLBACK_BANNER;

  async function saveName() {
    const v = nameDraft.trim();
    setEditingName(false);
    if (!v || v === profile?.displayName) return;
    setProfile(await updateProfile({ displayName: v }));
  }

  async function saveInfo() {
    setEditingInfo(false);
    setProfile(
      await updateProfile({
        bio: infoDraft.bio,
        location: infoDraft.location,
        birthday: infoDraft.birthday || null,
      })
    );
  }

  async function randomize() {
    setRandomizing(true);
    try {
      setProfile(await randomizeProfile());
      // Adopt the server-chosen avatar/banner over any local preview.
      setAvatarOverride(null);
      setBannerOverride(null);
    } finally {
      setRandomizing(false);
    }
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setComments((c) => [
      { id: Date.now(), name, avatar, time: "Just now", text },
      ...c,
    ]);
    setCommentText("");
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <StreamNav />
        <div className={styles.loading}>
          <Loader2 size={28} className={styles.loadingSpin} />
        </div>
      </div>
    );
  }

  const points = profile?.points ?? 0;
  const level = profile?.level ?? 1;
  const nextLevelAt = level * 250;
  const levelPct = Math.min(
    100,
    Math.round(((points % nextLevelAt) / nextLevelAt) * 100)
  );

  const stats = [
    { icon: Eye, label: "Views", value: fmt(profile?.profileViews ?? 0) },
    { icon: Heart, label: "Likes", value: fmt(profile?.likes ?? 0) },
    { icon: UserPlus, label: "Friends", value: fmt(profile?.friends ?? 0) },
    { icon: MessageSquare, label: "Posts", value: fmt(profile?.posts ?? 0) },
    { icon: MessageCircle, label: "Comments", value: fmt(profile?.commentsCount ?? 0) },
  ];

  return (
    <div className={styles.page}>
      <StreamNav />

      {/* ════════ BANNER ════════ */}
      <div className={styles.banner}>
        <Image src={banner} alt="" className={styles.bannerImg} width={1600} height={320} unoptimized />
        <div className={styles.bannerScrim} />
        <span className={styles.idBadge}>ID: {profile?.id ?? "—"}</span>
        <button
          className={styles.bannerEdit}
          type="button"
          onClick={() => bannerInput.current?.click()}
        >
          <Camera size={16} /> Change banner
        </button>
        <input
          ref={bannerInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => pickImage(e, setBannerOverride)}
        />
      </div>

      <div className={styles.shell}>
        {/* ════════ IDENTITY ════════ */}
        <header className={styles.identity}>
          <div className={styles.avatarWrap}>
            <Image src={avatar} alt={name} className={styles.avatar} width={160} height={160} unoptimized />
            <button
              className={styles.avatarEdit}
              type="button"
              onClick={() => avatarInput.current?.click()}
              aria-label="Change avatar"
            >
              <Camera size={18} />
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickImage(e, setAvatarOverride)}
            />
          </div>

          <div className={styles.identityBody}>
            <div className={styles.nameRow}>
              {editingName ? (
                <div className={styles.nameEdit}>
                  <input
                    className={styles.nameInput}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                  />
                  <button className={styles.miniBtn} type="button" onClick={saveName}>
                    <Check size={16} />
                  </button>
                  <button
                    className={styles.miniBtn}
                    type="button"
                    onClick={() => setEditingName(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className={styles.name}>{name}</h1>
                  <span className={styles.onlineDot} title="Online" />
                  <button
                    className={styles.editNameBtn}
                    type="button"
                    onClick={() => {
                      setNameDraft(name);
                      setEditingName(true);
                    }}
                    aria-label="Edit nickname"
                  >
                    <Pencil size={14} />
                  </button>
                </>
              )}
              <button
                className={styles.randomBtn}
                type="button"
                onClick={randomize}
                disabled={randomizing}
                title="Fill profile with random data (saved to the database)"
              >
                {randomizing ? (
                  <Loader2 size={15} className={styles.loadingSpin} />
                ) : (
                  <Dices size={15} />
                )}
                Randomize
              </button>
              <button className={styles.gearBtn} type="button" aria-label="Settings">
                <Settings size={18} />
              </button>
            </div>

            <div className={styles.levelRow}>
              <span className={styles.levelLabel}>
                Lvl {level} · {points >= 5000 ? "Immortal Ascension" : "Rising"}
              </span>
              <div className={styles.levelBar}>
                <div className={styles.levelFill} style={{ width: `${levelPct}%` }} />
              </div>
              <span className={styles.levelPts}>
                {fmt(points % nextLevelAt)} / {fmt(nextLevelAt)} pts
              </span>
              <Info size={15} className={styles.levelInfo} />
            </div>
          </div>
        </header>

        {/* ════════ TABS ════════ */}
        <nav className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`${styles.tab} ${activeTab === tab ? styles.tabOn : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Subscription" ? <span className={styles.pro}>pro</span> : null}
            </button>
          ))}
        </nav>

        {/* ════════ LAYOUT ════════ */}
        <div className={styles.layout} ref={mainRef}>
          {/* ─── stats column ─── */}
          <div className={styles.statsCol} data-rise>
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className={styles.statCard}>
                <Icon size={20} className={styles.statIcon} />
                <span className={styles.statLabel}>{label}</span>
                <span className={styles.statValue}>{value}</span>
              </div>
            ))}
            <a className={`${styles.statCard} ${styles.moreCard}`} href="#more">
              More <ChevronRight size={16} />
            </a>
          </div>

          {/* ─── main column ─── */}
          <div className={styles.mainCol}>
            {/* Badges */}
            <section className={styles.section} data-rise>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>
                  Badges <Info size={15} className={styles.titleInfo} />
                </h2>
                <div className={styles.sectionActions}>
                  <button className={styles.ghostBtn} type="button" aria-label="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className={styles.showAll} type="button">
                    Show all
                  </button>
                </div>
              </div>
              <div className={styles.badges}>
                {BADGES.map(({ label, Icon, c }) => (
                  <div key={label} className={styles.badge}>
                    <span
                      className={styles.badgeCircle}
                      style={{ color: c, borderColor: `${c}55` }}
                    >
                      <Icon size={26} />
                    </span>
                    <span className={styles.badgeLabel}>{label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Achievements */}
            <section className={styles.section} data-rise>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Achievements</h2>
                <div className={styles.sectionActions}>
                  <button className={styles.ghostBtn} type="button" aria-label="Edit">
                    <Pencil size={15} />
                  </button>
                  <button className={styles.showAll} type="button">
                    Show all
                  </button>
                </div>
              </div>
              <div className={styles.achGrid}>
                {ACHIEVEMENTS.map(({ label, grade, Icon }) => (
                  <div key={label} className={styles.ach}>
                    <span className={styles.achCircle}>
                      <Icon size={22} />
                      <span className={styles.achGrade}>{grade}</span>
                    </span>
                    <span className={styles.achLabel}>{label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Personal info */}
            <section className={styles.section} data-rise>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Personal info</h2>
                {editingInfo ? (
                  <div className={styles.sectionActions}>
                    <button className={styles.showAll} type="button" onClick={saveInfo}>
                      Save
                    </button>
                    <button
                      className={styles.ghostBtn}
                      type="button"
                      onClick={() => setEditingInfo(false)}
                      aria-label="Cancel"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.ghostBtn}
                    type="button"
                    onClick={() => {
                      setInfoDraft({
                        bio: profile?.bio ?? "",
                        location: profile?.location ?? "",
                        birthday: profile?.birthday ?? "",
                      });
                      setEditingInfo(true);
                    }}
                    aria-label="Edit personal info"
                  >
                    <Pencil size={15} />
                  </button>
                )}
              </div>

              {editingInfo ? (
                <div className={styles.infoEdit}>
                  <label className={styles.infoField}>
                    <span>Bio</span>
                    <textarea
                      className={styles.infoArea}
                      value={infoDraft.bio}
                      onChange={(e) =>
                        setInfoDraft({ ...infoDraft, bio: e.target.value })
                      }
                      rows={2}
                    />
                  </label>
                  <label className={styles.infoField}>
                    <span>Location</span>
                    <input
                      className={styles.infoInput}
                      value={infoDraft.location}
                      onChange={(e) =>
                        setInfoDraft({ ...infoDraft, location: e.target.value })
                      }
                    />
                  </label>
                  <label className={styles.infoField}>
                    <span>Birthday</span>
                    <input
                      type="date"
                      className={styles.infoInput}
                      value={infoDraft.birthday}
                      onChange={(e) =>
                        setInfoDraft({ ...infoDraft, birthday: e.target.value })
                      }
                    />
                  </label>
                </div>
              ) : (
                <dl className={styles.infoList}>
                  <p className={styles.bio}>
                    {profile?.bio || "No bio yet — hit Randomize or edit your info."}
                  </p>
                  <div className={styles.infoRow}>
                    <dt>Location</dt>
                    <dd>{profile?.location || "—"}</dd>
                  </div>
                  <div className={styles.infoRow}>
                    <dt>Birthday</dt>
                    <dd>{profile?.birthday || "—"}</dd>
                  </div>
                  <div className={styles.infoRow}>
                    <dt>Email</dt>
                    <dd>{profile?.email}</dd>
                  </div>
                  <div className={styles.infoRow}>
                    <dt>Joined</dt>
                    <dd>{joinedLabel(profile?.createdAt ?? null)}</dd>
                  </div>
                </dl>
              )}
            </section>

            {/* Comments */}
            <section className={styles.section} data-rise>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Comments</h2>
              </div>

              <form className={styles.commentForm} onSubmit={submitComment}>
                <Image src={avatar} alt="" className={styles.cFormAvatar} width={48} height={48} unoptimized />
                <input
                  className={styles.commentInput}
                  placeholder="Leave a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <button
                  className={styles.commentSend}
                  type="submit"
                  aria-label="Send"
                  disabled={!commentText.trim()}
                >
                  <Send size={18} />
                </button>
              </form>

              <div className={styles.commentList}>
                {comments.map((c) => (
                  <article key={c.id} className={styles.comment}>
                    <Image src={c.avatar} alt={c.name} className={styles.cAvatar} width={48} height={48} unoptimized />
                    <div className={styles.cBody}>
                      <div className={styles.cMeta}>
                        <span className={styles.cName}>{c.name}</span>
                        <span className={styles.cTime}>{c.time}</span>
                      </div>
                      <p className={styles.cText}>{c.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className={styles.footerWrap}>
        <StreamFooter />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
