"use client";

import Link from "next/link";
import { Flame, Globe, MessageCircle, Send } from "lucide-react";
import { NAV_ITEMS } from "@/data/mockAnime";
import styles from "@/app/stream/stream.module.css";

export default function StreamFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link href="/stream" className={styles.logo}>
              <span className={styles.logoMark}>
                <Flame size={18} fill="currentColor" />
              </span>
              <span className={styles.logoText}>Anifire</span>
            </Link>
            <p>
              Stream the best anime in HD with multi-language subtitles and dubs. A
              demo streaming front end built on Next.js, Spring Boot and PostgreSQL.
            </p>
          </div>

          <div className={styles.footerCols}>
            <div>
              <h3>Browse</h3>
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div>
              <h3>Company</h3>
              <Link href="/stream">Home</Link>
              <Link href="#catalog">Catalog</Link>
              <Link href="#genres">Genres</Link>
              <Link href="#my-list">My List</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© 2026 Anifire Streaming. All rights reserved.</p>
          <div className={styles.footerSocials}>
            <Link href="/" aria-label="Telegram">
              <Send size={17} />
            </Link>
            <Link href="/" aria-label="Discord">
              <MessageCircle size={17} />
            </Link>
            <Link href="/" aria-label="Website">
              <Globe size={17} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
