"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Clock,
  Edit3,
  Eye,
  Flame,
  FolderTree,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PlayCircle,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Movie } from "@/data/mockAnime";
import {
  createAnime,
  createCategory,
  deleteAnime,
  deleteCategory,
  fetchAdminAnalytics,
  fetchAdminUsers,
  fetchCategories,
  fetchPagedMovies,
  updateAdminUser,
  updateAnime,
  type AdminAnalytics,
  type AdminUser,
  type AnimeFormInput,
  type Category,
} from "@/data/animeApi";
import styles from "./admin.module.css";

const emptyAnime: AnimeFormInput = {
  title: "",
  description: "",
  imageUrl: "",
  rating: null,
  categoryIds: [],
};

type AdminTab = "overview" | "catalog" | "users";

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [notice, setNotice] = useState<string | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [animeForm, setAnimeForm] = useState<AnimeFormInput>(emptyAnime);
  const [editingAnimeId, setEditingAnimeId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");

  const isAdmin = user?.role === "ADMIN";
  const verifiedRate = analytics?.users.total
    ? Math.round((analytics.users.verified / analytics.users.total) * 100)
    : 0;
  const adminRate = analytics?.users.total
    ? Math.round((analytics.users.admins / analytics.users.total) * 100)
    : 0;
  const maxCategoryCount = Math.max(
    1,
    ...(analytics?.categories.map((category) => category.animeCount) ?? [1])
  );

  const loadCatalog = useCallback(async () => {
    const [cats, paged] = await Promise.all([
      fetchCategories(),
      fetchPagedMovies({ page, size: 8, search, categoryId }),
    ]);
    setCategories(cats);
    setMovies(paged.items);
    setTotalPages(Math.max(1, paged.totalPages));
  }, [categoryId, page, search]);

  const loadAnalytics = useCallback(async () => {
    if (!isAdmin) return;
    setAnalytics(await fetchAdminAnalytics());
  }, [isAdmin]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsers(await fetchAdminUsers());
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCategories(),
      fetchPagedMovies({ page, size: 8, search, categoryId }),
    ]).then(([cats, paged]) => {
      if (cancelled) return;
      setCategories(cats);
      setMovies(paged.items);
      setTotalPages(Math.max(1, paged.totalPages));
    });
    return () => {
      cancelled = true;
    };
  }, [categoryId, page, search]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetchAdminUsers().then((items) => {
      if (!cancelled) setUsers(items);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetchAdminAnalytics().then((snapshot) => {
      if (!cancelled) setAnalytics(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function handleAnimeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    const payload = {
      ...animeForm,
      title: animeForm.title.trim(),
      description: animeForm.description.trim(),
      imageUrl: animeForm.imageUrl.trim(),
    };
    try {
      if (editingAnimeId) await updateAnime(editingAnimeId, payload);
      else await createAnime(payload);
      setAnimeForm(emptyAnime);
      setEditingAnimeId(null);
      await loadCatalog();
      await loadAnalytics();
      setNotice("Anime saved.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to save anime.");
    }
  }

  async function handleCategorySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      await createCategory(categoryName);
      setCategoryName("");
      await loadCatalog();
      await loadAnalytics();
      setNotice("Category added.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to save category.");
    }
  }

  function startEdit(movie: Movie) {
    setEditingAnimeId(movie.id);
    setAnimeForm({
      title: movie.title,
      description: movie.description,
      imageUrl: movie.imageUrl,
      rating: movie.match / 10,
      categoryIds: categories
        .filter((category) => movie.tags.includes(category.name))
        .map((category) => category.id),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteAnime(id: number) {
    try {
      await deleteAnime(id);
      await loadCatalog();
      await loadAnalytics();
      setNotice("Anime deleted.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to delete anime.");
    }
  }

  async function handleDeleteCategory(id: number) {
    try {
      await deleteCategory(id);
      await loadCatalog();
      await loadAnalytics();
      setNotice("Category deleted.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to delete category.");
    }
  }

  async function handleRole(userId: number, role: AdminUser["role"]) {
    await updateAdminUser(userId, { role });
    await loadUsers();
    await loadAnalytics();
  }

  function toggleCategory(id: number) {
    setAnimeForm((form) => ({
      ...form,
      categoryIds: form.categoryIds.includes(id)
        ? form.categoryIds.filter((categoryId) => categoryId !== id)
        : [...form.categoryIds, id],
    }));
  }

  if (loading) {
    return <div className={styles.page}>Loading admin session...</div>;
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.lockCard}>
          <Flame size={32} />
          <h1>Sign in required</h1>
          <p>Admin tools are available only after login.</p>
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.lockCard}>
          <Shield size={32} />
          <h1>Admin only</h1>
          <p>Your current role is {user.role}. Only admins can manage anime, categories and users.</p>
          <Link href="/stream">Back to catalog</Link>
        </div>
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; Icon: typeof Users }[] = [
    { id: "overview", label: "Overview", Icon: LayoutDashboard },
    { id: "catalog", label: "Catalog", Icon: Clapperboard },
    { id: "users", label: "Users", Icon: Users },
  ];

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.adminLayout}>
        {/* ════════ SIDEBAR ════════ */}
        <aside className={styles.sidebar}>
          <Link href="/stream" className={styles.brand}>
            <Flame size={20} fill="currentColor" /> Anifire Admin
          </Link>
          <nav className={styles.sideNav}>
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`${styles.sideNavItem} ${tab === id ? styles.sideNavOn : ""}`}
                onClick={() => setTab(id)}
              >
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
          <div className={styles.sideAccount}>
            <div className={styles.sideAvatar}>
              {(user.displayName || user.email)[0]?.toUpperCase()}
            </div>
            <div className={styles.sideAccountBody}>
              <strong>{user.displayName || user.email.split("@")[0]}</strong>
              <span className={styles.sideRole}>
                <Shield size={11} /> {user.role}
              </span>
              <span className={styles.sideEmail}>{user.email}</span>
            </div>
            <button
              type="button"
              className={styles.sideLogout}
              onClick={handleLogout}
              title="Log out"
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </aside>

        <main className={styles.shell}>
          {tab === "overview" && (
            <>
              <section className={styles.hero}>
                <div>
                  <p className={styles.eyebrow}>Dashboard</p>
                  <h1>Site analytics & control center</h1>
                  <p>
                    Monitor users, catalog health, content growth and role access
                    from one admin surface.
                  </p>
                </div>
                <div className={styles.heroStatus}>
                  <span className={styles.statusDot} />
                  Backend online
                </div>
              </section>

              <section className={styles.kpiGrid} aria-label="Site analytics summary">
          <article className={styles.kpiCard}>
            <span className={styles.kpiIcon}>
              <Users size={20} />
            </span>
            <div>
              <p>Total users</p>
              <strong>{analytics?.users.total ?? users.length}</strong>
              <span>{analytics?.users.admins ?? 0} admins</span>
            </div>
          </article>
          <article className={styles.kpiCard}>
            <span className={styles.kpiIcon}>
              <Flame size={20} />
            </span>
            <div>
              <p>Anime titles</p>
              <strong>{analytics?.content.anime ?? movies.length}</strong>
              <span>{totalPages} catalog pages</span>
            </div>
          </article>
          <article className={styles.kpiCard}>
            <span className={styles.kpiIcon}>
              <FolderTree size={20} />
            </span>
            <div>
              <p>Categories</p>
              <strong>{analytics?.content.categories ?? categories.length}</strong>
              <span>many-to-many filters</span>
            </div>
          </article>
          <article className={styles.kpiCard}>
            <span className={styles.kpiIcon}>
              <MessageCircle size={20} />
            </span>
            <div>
              <p>Comments</p>
              <strong>{analytics?.content.comments ?? 0}</strong>
              <span>{analytics?.content.averageCommentsPerAnime ?? 0} avg/title</span>
            </div>
          </article>
          <article className={styles.kpiCard}>
            <span className={styles.kpiIcon}>
              <Eye size={20} />
            </span>
            <div>
              <p>Total views</p>
              <strong>{analytics?.watch.totalViews ?? 0}</strong>
              <span>
                {analytics?.watch.views7d ?? 0} this week ·{" "}
                {analytics?.watch.uniqueViewers ?? 0} viewers
              </span>
            </div>
          </article>
        </section>

        <section className={styles.dashboardGrid}>
          <article className={`${styles.panel} ${styles.analyticsPanel}`}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.eyebrow}>Site analytics</p>
                <h2>Operational pulse</h2>
              </div>
              <Activity size={20} />
            </div>
            <div className={styles.pulseBars}>
              {(analytics?.activity ?? []).map((item) => {
                const max = Math.max(...(analytics?.activity.map((m) => m.value) ?? [1]), 1);
                return (
                  <div key={item.label} className={styles.pulseRow}>
                    <span>{item.label}</span>
                    <div className={styles.pulseTrack}>
                      <i style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
                    </div>
                    <strong>{item.value}</strong>
                  </div>
                );
              })}
            </div>
          </article>

          <article className={`${styles.panel} ${styles.analyticsPanel}`}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.eyebrow}>Users analytics</p>
                <h2>Roles & verification</h2>
              </div>
              <BarChart3 size={20} />
            </div>
            <div className={styles.ringGrid}>
              <div className={styles.ring} style={{ "--value": `${verifiedRate}%` } as React.CSSProperties}>
                <strong>{verifiedRate}%</strong>
                <span>verified</span>
              </div>
              <div className={styles.ring} style={{ "--value": `${adminRate}%` } as React.CSSProperties}>
                <strong>{adminRate}%</strong>
                <span>admins</span>
              </div>
            </div>
            <div className={styles.metricList}>
              <span>
                <CheckCircle2 size={15} /> {analytics?.users.verified ?? 0} verified users
              </span>
              <span>
                <Shield size={15} /> {analytics?.users.regularUsers ?? 0} regular users
              </span>
            </div>
          </article>

          <article className={`${styles.panel} ${styles.analyticsPanel} ${styles.widePanel}`}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.eyebrow}>Category coverage</p>
                <h2>Anime distribution by category</h2>
              </div>
            </div>
            <div className={styles.categoryBars}>
              {(analytics?.categories ?? []).map((category) => (
                <div key={category.id} className={styles.categoryRow}>
                  <span>{category.name}</span>
                  <div className={styles.categoryTrack}>
                    <i
                      style={{
                        width: `${Math.max(6, (category.animeCount / maxCategoryCount) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{category.animeCount}</strong>
                </div>
              ))}
              {analytics?.categories.length === 0 ? (
                <p className={styles.emptyText}>No categories yet. Add one below to start filtering the catalog.</p>
              ) : null}
            </div>
          </article>
        </section>

        {/* ════════ WATCH ANALYTICS (real playback events) ════════ */}
        <section className={styles.watchSection}>
          <article className={`${styles.panel} ${styles.analyticsPanel}`}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.eyebrow}>Watch analytics</p>
                <h2>Most watched</h2>
              </div>
              <PlayCircle size={20} />
            </div>
            <div className={styles.pulseBars}>
              {(analytics?.topAnime ?? []).map((item) => {
                const max = Math.max(
                  ...(analytics?.topAnime.map((m) => m.views) ?? [1]),
                  1
                );
                return (
                  <Link
                    key={item.animeKey}
                    href={`/anime/${item.animeKey}`}
                    className={`${styles.pulseRow} ${styles.pulseLink}`}
                  >
                    <span title={item.title}>{item.title}</span>
                    <div className={styles.pulseTrack}>
                      <i style={{ width: `${Math.max(8, (item.views / max) * 100)}%` }} />
                    </div>
                    <strong>{item.views}</strong>
                  </Link>
                );
              })}
              {analytics && analytics.topAnime.length === 0 ? (
                <p className={styles.emptyText}>
                  No views yet. Play an episode to populate these stats.
                </p>
              ) : null}
            </div>
          </article>

          <article className={`${styles.panel} ${styles.analyticsPanel}`}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.eyebrow}>Live feed</p>
                <h2>Recent activity — who watched what</h2>
              </div>
              <Clock size={20} />
            </div>
            <div className={styles.feedList}>
              {(analytics?.recentViews ?? []).map((v, i) => (
                <div key={i} className={styles.feedRow}>
                  <span className={styles.feedUser}>{v.user}</span>
                  <span className={styles.feedAction}>watched</span>
                  <Link
                    href={`/anime/${v.animeKey}`}
                    className={styles.feedAnime}
                    title={v.animeTitle}
                  >
                    {v.animeTitle}
                  </Link>
                  <span className={styles.feedEp}>ep {v.episode}</span>
                  <span className={styles.feedTime}>
                    {v.watchedAt
                      ? new Date(v.watchedAt).toLocaleString()
                      : ""}
                  </span>
                </div>
              ))}
              {analytics && analytics.recentViews.length === 0 ? (
                <p className={styles.emptyText}>No watch activity recorded yet.</p>
              ) : null}
            </div>
          </article>
        </section>

            </>
          )}

          {tab === "catalog" && (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <div>
                    <p className={styles.eyebrow}>Product module</p>
                    <h1>{editingAnimeId ? "Edit anime" : "Add anime"}</h1>
                  </div>
            {editingAnimeId ? (
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => {
                  setAnimeForm(emptyAnime);
                  setEditingAnimeId(null);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          {notice ? <div className={styles.notice}>{notice}</div> : null}

          <form className={styles.formGrid} onSubmit={handleAnimeSubmit}>
            <label>
              Title
              <input
                required
                value={animeForm.title}
                onChange={(e) => setAnimeForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label>
              Rating
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={animeForm.rating ?? ""}
                onChange={(e) =>
                  setAnimeForm((f) => ({
                    ...f,
                    rating: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </label>
            <label className={styles.wide}>
              Image URL
              <input
                value={animeForm.imageUrl}
                onChange={(e) => setAnimeForm((f) => ({ ...f, imageUrl: e.target.value }))}
              />
            </label>
            <label className={styles.wide}>
              Description
              <textarea
                rows={4}
                value={animeForm.description}
                onChange={(e) =>
                  setAnimeForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <div className={styles.wide}>
              <span className={styles.labelText}>Categories</span>
              <div className={styles.checks}>
                {categories.map((category) => (
                  <label key={category.id} className={styles.check}>
                    <input
                      type="checkbox"
                      checked={animeForm.categoryIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>
            <button className={styles.primaryBtn} type="submit">
              <Plus size={16} /> {editingAnimeId ? "Save changes" : "Add anime"}
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Categories</p>
              <h2>Manage categories</h2>
            </div>
          </div>
          <form className={styles.inlineForm} onSubmit={handleCategorySubmit}>
            <input
              placeholder="Category name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <button className={styles.primaryBtn} type="submit">
              Add
            </button>
          </form>
          <div className={styles.chips}>
            {categories.map((category) => (
              <span key={category.id} className={styles.chip}>
                {category.name}
                <button type="button" onClick={() => handleDeleteCategory(category.id)}>
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.eyebrow}>Server-side search</p>
              <h2>Anime list</h2>
            </div>
          </div>
          <div className={styles.filters}>
            <input
              placeholder="Search by title"
              value={search}
              onChange={(e) => {
                setPage(0);
                setSearch(e.target.value);
              }}
            />
            <select
              value={categoryId ?? ""}
              onChange={(e) => {
                setPage(0);
                setCategoryId(e.target.value ? Number(e.target.value) : null);
              }}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.table}>
            {movies.map((movie) => (
              <article key={movie.id} className={styles.row}>
                <Image src={movie.imageUrl} alt="" width={72} height={108} unoptimized />
                <div>
                  <strong>{movie.title}</strong>
                  <span>{movie.genre}</span>
                </div>
                <button type="button" onClick={() => startEdit(movie)}>
                  <Edit3 size={15} /> Edit
                </button>
                <button type="button" onClick={() => handleDeleteAnime(movie.id)}>
                  <Trash2 size={15} /> Delete
                </button>
              </article>
            ))}
          </div>
          <div className={styles.pager}>
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} /> Prev
            </button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </section>

            </>
          )}

          {tab === "users" && (
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <p className={styles.eyebrow}>Roles</p>
                  <h2>User management</h2>
                </div>
              </div>
              <div className={styles.userList}>
            {users.map((item) => (
              <div key={item.id} className={styles.userRow}>
                <div>
                  <strong>{item.displayName || item.email}</strong>
                  <span>{item.email}</span>
                </div>
                <select
                  value={item.role}
                  onChange={(e) => handleRole(item.id, e.target.value as AdminUser["role"])}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
