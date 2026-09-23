import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import styles from "./auth.module.css";

export const metadata: Metadata = {
  title: "Anifire — Account",
  description: "Sign in or create your Anifire account.",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={styles.wrap}>
      {/* ───────── Brand panel (desktop) ───────── */}
      <aside className={styles.brand}>
        <div className={styles.brandGrain} />
        <Flame className={styles.brandFlame} strokeWidth={1} aria-hidden="true" />

        <div className={styles.brandTop}>
          <Link href="/" className={styles.logoLink}>
            <span className={styles.logoMark}>
              <Flame size={18} fill="currentColor" />
            </span>
            <span className={styles.logoText}>Anifire</span>
          </Link>
        </div>

        <div className={styles.brandBody}>
          <span className={styles.brandEyebrow}>
            <Sparkles size={14} /> 12,000+ titles · ad-free
          </span>
          <h2 className={styles.brandHeadline}>
            Where every story <em>ignites</em>.
          </h2>
          <p className={styles.brandSub}>
            Stream the seasons&apos; biggest anime in crisp HD, build your list,
            and pick up exactly where you left off — on any screen.
          </p>
        </div>

        <div className={styles.brandFooter}>
          <span>© 2026 Anifire</span>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </div>
      </aside>

      {/* ───────── Form panel ───────── */}
      <main className={styles.panel}>{children}</main>
    </div>
  );
}
