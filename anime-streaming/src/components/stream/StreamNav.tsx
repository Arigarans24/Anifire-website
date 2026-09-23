"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Flame,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NAV_ITEMS } from "@/data/mockAnime";
import styles from "@/app/stream/stream.module.css";

/**
 * Shared top navigation for the streaming experience — used on both the
 * /stream catalog and the /anime/[id] detail page. Glassy + scroll-aware.
 */
export default function StreamNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  // Map the placeholder hash links to real in-app views.
  const navHref = (href: string) => {
    if (href === "#catalog") return "/stream?view=catalog";
    if (href === "#genres") return "/stream?view=genres";
    if (href === "#my-list") return "/mylist";
    return href;
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the profile dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <>
      <header className={`${styles.nav} ${scrolled || open ? styles.navSolid : ""}`}>
        <div className={styles.navLeft}>
          <Link href="/stream" className={styles.logo}>
            <span className={styles.logoMark}>
              <Flame size={18} fill="currentColor" />
            </span>
            <span className={styles.logoText}>Anifire</span>
          </Link>
          <nav className={styles.navLinks}>
            {NAV_ITEMS.map((item) => (
              <Link key={item.label} href={navHref(item.href)} className={styles.navLink}>
                {item.label}
              </Link>
            ))}
            {user?.role === "ADMIN" ? (
              <Link href="/admin" className={styles.navLink}>
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className={styles.navRight}>
          <form
            className={`${styles.searchBox} ${searchOpen ? styles.searchBoxOpen : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchQuery.trim();
              router.push(q ? `/stream?view=catalog&q=${encodeURIComponent(q)}` : "/stream?view=catalog");
              setSearchOpen(false);
            }}
          >
            <button
              className={styles.iconBtn}
              type="button"
              aria-label="Search"
              onClick={() => {
                if (searchOpen && searchQuery.trim()) {
                  router.push(`/stream?view=catalog&q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchOpen(false);
                } else {
                  setSearchOpen((v) => !v);
                }
              }}
            >
              <Search size={18} />
            </button>
            <input
              className={styles.searchInput}
              placeholder="Search anime…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search anime"
            />
          </form>
          <button
            className={`${styles.iconBtn} ${styles.mobileBtn}`}
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className={styles.profileWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.avatar}
              aria-label="Profile menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Flame size={16} fill="currentColor" />
            </button>
            {menuOpen ? (
              <div className={styles.profileMenu} role="menu">
                {user ? (
                  <div className={styles.profileHead}>
                    <span className={styles.profileName}>
                      {user.displayName || user.email?.split("@")[0]}
                    </span>
                    <span className={styles.profileEmail}>{user.email}</span>
                  </div>
                ) : null}
                <Link
                  href="/profile"
                  className={styles.profileItem}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserIcon size={16} /> Profile
                </Link>
                <Link
                  href="/profile"
                  className={styles.profileItem}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings size={16} /> Settings
                </Link>
                {user?.role === "ADMIN" ? (
                  <Link
                    href="/admin"
                    className={styles.profileItem}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shield size={16} /> Admin
                  </Link>
                ) : null}
                {user ? (
                  <button
                    type="button"
                    className={`${styles.profileItem} ${styles.profileDanger}`}
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} /> Log out
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className={styles.profileItem}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    <LogOut size={16} /> Sign in
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={styles.mobileMenu}
        style={{ height: open ? "calc(100dvh - 74px)" : 0 }}
      >
        <div className={styles.mobileInner}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={styles.mobileLink}
              onClick={() => setOpen(false)}
            >
              {item.label}
              <ChevronRight size={18} />
            </Link>
          ))}
          {user?.role === "ADMIN" ? (
            <Link href="/admin" className={styles.mobileLink} onClick={() => setOpen(false)}>
              Admin
              <ChevronRight size={18} />
            </Link>
          ) : null}
          <Link
            href="/profile"
            className={styles.mobileLink}
            onClick={() => setOpen(false)}
          >
            Profile
            <ChevronRight size={18} />
          </Link>
          {user ? (
            <button
              type="button"
              className={styles.mobileLink}
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
            >
              Log out
              <LogOut size={18} />
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
