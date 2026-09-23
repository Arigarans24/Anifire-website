"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Database,
  Flame,
  Globe,
  LayoutGrid,
  Mail,
  MessageCircle,
  Palette,
  Play,
  Rocket,
  Send,
  Server,
  Star,
  Subtitles,
  UploadCloud,
  Users,
  Wand2,
} from "lucide-react";
import HeroBeam from "@/components/home/HeroBeam";
import RedTunnel from "@/components/home/RedTunnel";
import { useAuth } from "@/components/auth/AuthProvider";
import styles from "./home.module.css";

const stackCards = [
  {
    kicker: "Frontend",
    title: "Next.js 16 · React 19",
    text: "App Router, the React Compiler and server components — instant navigation and a cinematic UI with zero bloat.",
    icon: LayoutGrid,
    visual: "globe",
  },
  {
    kicker: "Backend",
    title: "Spring Boot · Java 21",
    text: "A clean controller → service → repository architecture running on Java 21 virtual threads.",
    icon: Server,
    visual: "rings",
  },
  {
    kicker: "Data",
    title: "PostgreSQL · Jikan API",
    text: "Top anime is pulled from MyAnimeList and persisted with soft deletes, so the catalog stays consistent.",
    icon: Database,
    visual: "data",
  },
  {
    kicker: "Motion",
    title: "Three.js · GSAP · Tailwind v4",
    text: "WebGL shaders, ScrollTrigger choreography and utility-first styling. The whole page is one continuous light flow.",
    icon: Boxes,
    visual: "logos",
  },
] as const;

const dashStats = [
  { label: "Total streams", value: "1.24M", delta: "+18.2%" },
  { label: "Active viewers", value: "48,920", delta: "+6.4%" },
  { label: "Uptime", value: "99.98%", delta: "30d" },
  { label: "Titles served", value: "2,350", delta: "+120" },
];

const checklist = [
  {
    title: "Upload your catalog",
    text: "Import titles from the Jikan API or your own library in a few clicks.",
    icon: UploadCloud,
  },
  {
    title: "Brand it your way",
    text: "Swap colors, banners and typography to match your platform identity.",
    icon: Palette,
  },
  {
    title: "Go live in minutes",
    text: "Ship a production-grade streaming front end without touching infra.",
    icon: Rocket,
  },
];

const features = [
  {
    title: "Deep Audience Analytics",
    text: "Track viewership in real time, watch server load during premieres, and see exactly which titles keep your audience hooked.",
    icon: BarChart3,
    image: "/hero-1.png",
    tag: "Analytics",
  },
  {
    title: "Dynamic Curation Tools",
    text: "Update homepage banners, highlight seasonal releases and build custom collections that bring viewers back.",
    icon: Wand2,
    image: "/hero-2.png",
    tag: "Curation",
  },
  {
    title: "Advanced Localization",
    text: "Attach multiple subtitle tracks (ASS/SRT) and manage dub audio per episode — a service built for a global fandom.",
    icon: Subtitles,
    image: "/hero-3.png",
    tag: "Localization",
  },
  {
    title: "Users & Subscriptions",
    text: "Manage accounts, track premium subscriptions and securely monitor active sessions from a single panel.",
    icon: Users,
    image: "/furnace-bg.png",
    tag: "Accounts",
  },
] as const;

const footerNavigation = [
  { label: "Stack", href: "#stack" },
  { label: "Platform", href: "#platform" },
  { label: "In action", href: "#action" },
  { label: "Streaming", href: "/stream" },
  { label: "Pricing", href: "#" },
];
const footerProfile = [
  { label: "Login", href: "/login" },
  { label: "Sign up", href: "/register" },
  { label: "Account", href: "/login" },
  { label: "Watchlist", href: "/stream" },
  { label: "Settings", href: "/stream" },
];

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const igniteScrollRef = useRef<HTMLDivElement>(null);
  const featureTriggerRef = useRef<ScrollTrigger | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    if (!loading && user) router.replace("/stream");
  }, [loading, router, user]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const mm = gsap.matchMedia();

    const ctx = gsap.context(() => {
      if (!reduceMotion) {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(`.${styles.kicker}`, { y: 24, opacity: 0, duration: 0.7 })
          .from(
            `.${styles.heroWord}`,
            { y: 60, opacity: 0, duration: 0.9, stagger: 0.12 },
            "-=0.3"
          )
          .from(`.${styles.heroSub}`, { y: 24, opacity: 0, duration: 0.7 }, "-=0.4")
          .from(
            `.${styles.heroCtas} > *`,
            { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 },
            "-=0.4"
          )
          .from(
            `.${styles.heroMeta} > *`,
            { opacity: 0, duration: 0.8, stagger: 0.15 },
            "-=0.3"
          );

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            y: 48,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 84%" },
          });
        });

        const frame = root.querySelector(`.${styles.videoFrame}`);
        if (frame) {
          gsap.fromTo(
            frame,
            { scale: 0.84, yPercent: 4 },
            {
              scale: 1,
              yPercent: 0,
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start: "top 90%",
                end: "top 30%",
                scrub: true,
              },
            }
          );
        }
      }

      // Pinned, scroll-driven feature highlight — desktop only.
      mm.add("(min-width: 901px)", () => {
        const scroller = igniteScrollRef.current;
        const pin = pinRef.current;
        if (!scroller || !pin) return;
        const trigger = ScrollTrigger.create({
          trigger: scroller,
          start: "top top",
          end: "bottom bottom",
          pin: pin,
          pinSpacing: true,
          onUpdate: (self) => {
            const idx = Math.min(
              features.length - 1,
              Math.floor(self.progress * features.length)
            );
            setActiveFeature(idx);
          },
        });
        featureTriggerRef.current = trigger;
        return () => {
          trigger.kill();
          featureTriggerRef.current = null;
        };
      });

      ScrollTrigger.refresh();
    }, root);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const tid = window.setTimeout(refresh, 600);

    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(tid);
      mm.revert();
      ctx.revert();
    };
  }, []);

  // Clicking a feature scrolls the pinned section to that segment (desktop),
  // or just activates it (mobile, where the section is unpinned).
  const handleFeatureClick = useCallback((i: number) => {
    setActiveFeature(i);
    const trigger = featureTriggerRef.current;
    if (trigger) {
      const target =
        trigger.start +
        ((i + 0.5) / features.length) * (trigger.end - trigger.start);
      gsap.to(window, {
        duration: 0.7,
        ease: "power2.inOut",
        scrollTo: { y: target, autoKill: false },
      });
    }
  }, []);

  return (
    <main ref={rootRef} className={styles.page}>
      <div className={styles.grain} />

      {/* ---------- NAV ---------- */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo} aria-label="Anifire home">
          <span className={styles.logoMark}>
            <Flame size={22} fill="currentColor" />
          </span>
          <span className={styles.logoText}>Anifire</span>
        </Link>

        <div className={styles.navLinks}>
          <a href="#stack">Stack</a>
          <a href="#platform">Platform</a>
          <a href="#action">In action</a>
        </div>

        <div className={styles.navActions}>
          <Link href="/login" className={styles.login}>
            Login
          </Link>
          <Link href="/register" className={styles.signup}>
            Sign up
          </Link>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <section className={styles.hero}>
        <HeroBeam className={styles.heroCanvas} />
        <div className={styles.heroVignette} />

        <div className={styles.heroInner}>
          <p className={styles.kicker}>Anime streaming platform · 2026</p>

          <h1 className={styles.heroHeadline}>
            <span className={styles.heroWord}>Stream</span>
            <span className={styles.heroWordGap} aria-hidden="true" />
            <span className={styles.heroWord}>Onward</span>
          </h1>

          <p className={styles.heroSub}>
            A cinematic gateway into anime. The light leads from brand to playback —
            a fast start, a dark interface and a full streaming showcase.
          </p>

          <div className={styles.heroCtas}>
            <Link href="/stream" className={styles.primaryCta}>
              <Play size={18} fill="currentColor" />
              Start watching
            </Link>
            <a href="#stack" className={styles.secondaryCta}>
              Explore the stack
              <ArrowRight size={18} />
            </a>
          </div>
        </div>

        <div className={styles.heroMeta}>
          <span>Anifire Studio</span>
          <span>Always · Onward · 2026</span>
        </div>
      </section>

      {/* ---------- VIDEO ---------- */}
      {/* ---------- STACK / BENTO ---------- */}
      <section id="stack" className={styles.stackSection}>
        <div className={styles.sectionHead} data-reveal>
          <p className={styles.eyebrow}>The stack behind the fire</p>
          <h2 className={styles.sectionTitle}>
            Built on a modern, full-stack foundation.
          </h2>
          <p className={styles.sectionLead}>
            Anifire is a finished product, not a landing page: a typed front end, a
            strict back end and a real database — held together by one design
            language.
          </p>
        </div>

        <div className={styles.bentoGrid}>
          {stackCards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={`${styles.bentoCard} ${styles[card.visual]}`}
                data-reveal
              >
                <div className={styles.cardTop}>
                  <span className={styles.cardIcon}>
                    <Icon size={18} />
                  </span>
                  <span className={styles.cardKicker}>{card.kicker}</span>
                </div>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardText}>{card.text}</p>
                <div className={styles.cardVisual} aria-hidden="true" />
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------- QUALITY / IMPRESSION ---------- */}
      <section id="quality" className={styles.qualitySection}>
        <div className={styles.qualityHead} data-reveal>
          <p className={styles.eyebrow}>Quality you can trust</p>
          <h2 className={styles.sectionTitle}>
            Built to scale.
            <br />
            And built to last.
          </h2>
          <p className={styles.sectionLead}>
            Every layer follows best practices out of the box — blazing-fast
            delivery, real persistence and motion that never gets in the way.
          </p>
        </div>

        <div className={styles.planetStage} aria-hidden="true">
          <div className={styles.planet} />
          <div className={styles.planetGlow} />
        </div>

        <div className={styles.impression} data-reveal>
          <h3>Make the right impression</h3>
          <p>
            Anifire makes it effortless to launch a streaming front end that
            resonates with a design-centric, premium audience.
          </p>
        </div>

        <div className={styles.showcase}>
          <ul className={styles.checklist} data-reveal>
            {checklist.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className={styles.checkItem}>
                  <span className={styles.checkIcon}>
                    <Icon size={18} />
                  </span>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.text}</p>
                  </div>
                </li>
              );
            })}
            <Link href="/stream" className={styles.primaryCta}>
              <Play size={16} fill="currentColor" /> Launch the platform
            </Link>
          </ul>

          <div className={styles.dashboard} data-reveal>
            <div className={styles.dashboardBar}>
              <span className={styles.dashDot} />
              <span>Anifire · Dashboard</span>
            </div>
            <div className={styles.dashboardStats}>
              {dashStats.map((s) => (
                <div key={s.label} className={styles.statCell}>
                  <span className={styles.statLabel}>{s.label}</span>
                  <span className={styles.statValue}>{s.value}</span>
                  <span className={styles.statDelta}>{s.delta}</span>
                </div>
              ))}
            </div>
            <div className={styles.dashboardChart} aria-hidden="true">
              {[42, 64, 38, 78, 56, 90, 70, 84].map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- IGNITE / STICKY FEATURES ---------- */}
      <section id="platform" className={styles.igniteSection}>
        <div className={styles.igniteIntro} data-reveal>
          <p className={styles.eyebrow}>Built for operators</p>
          <h2 className={styles.sectionTitle}>Ignite your streaming platform.</h2>
          <p className={styles.sectionLead}>
            Anifire is engineered for maximum uptime and blazing-fast delivery. We
            handle the heavy lifting — you bring the best anime to your audience.
          </p>
        </div>

        <div ref={igniteScrollRef} className={styles.igniteScroll}>
          <div ref={pinRef} className={styles.ignitePin}>
            <div className={styles.igniteGrid}>
              <ul className={styles.featureList}>
                {features.map((f, i) => {
                  const Icon = f.icon;
                  const active = i === activeFeature;
                  return (
                    <li
                      key={f.title}
                      className={`${styles.featureItem} ${
                        active ? styles.featureActive : ""
                      }`}
                      onClick={() => handleFeatureClick(i)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={active}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleFeatureClick(i);
                        }
                      }}
                    >
                      <div className={styles.featureHead}>
                        <span className={styles.featureIcon}>
                          <Icon size={18} />
                        </span>
                        <h3>{f.title}</h3>
                      </div>
                      <p>{f.text}</p>
                      <span className={styles.featureBar} aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>

              <div className={styles.mediaPanel}>
                {features.map((f, i) => (
                  <div
                    key={f.title}
                    className={`${styles.mediaItem} ${
                      i === activeFeature ? styles.mediaActive : ""
                    }`}
                    style={{ backgroundImage: `url(${f.image})` }}
                  >
                    <div className={styles.mediaScrim} />
                    <span className={styles.mediaTag}>{f.tag}</span>
                    <span className={styles.mediaTitle}>{f.title}</span>
                  </div>
                ))}
                <div className={styles.mediaProgress}>
                  {features.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Show feature ${i + 1}`}
                      className={i === activeFeature ? styles.dotActive : ""}
                      onClick={() => handleFeatureClick(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- RED TUNNEL CTA ---------- */}
      <section id="action" className={styles.tunnelSection}>
        <RedTunnel className={styles.tunnelCanvas} />
        <div className={styles.tunnelInner}>
          <Link href="/stream" className={styles.watchBtn}>
            <Play size={16} fill="currentColor" /> Watch now
          </Link>
          <h2 className={styles.tunnelTitle}>See it in action</h2>

          <div className={styles.browserMock} data-reveal>
            <div className={styles.browserChrome}>
              <span className={styles.browserDots}>
                <i />
                <i />
                <i />
              </span>
              <span className={styles.browserUrl}>anifire.app / stream</span>
            </div>
            <div
              className={styles.browserScreen}
              style={{ backgroundImage: "url(/hero-2.png)" }}
            >
              <div className={styles.browserScrim} />
              <div className={styles.browserOverlay}>
                <span className={styles.browserBadge}>
                  <Flame size={14} fill="currentColor" /> Now streaming
                </span>
                <div className={styles.browserTitleRow}>
                  <h3>Fire Blade</h3>
                  <span className={styles.browserRating}>
                    <Star size={14} fill="currentColor" /> 9.2
                  </span>
                </div>
                <p>Fantasy · Action — the new season is already in the catalog.</p>
                <Link href="/stream" className={styles.primaryCta}>
                  <Play size={16} fill="currentColor" /> Enter /stream
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER (full width) ---------- */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogoBox}>
                <Flame size={48} fill="currentColor" />
              </div>
              <div>
                <h2>Anifire</h2>
                <p>
                  A fiery gateway into anime streaming: a branded landing page, fast
                  sign-up and a seamless transition into playback. Built on Next.js,
                  Spring Boot and PostgreSQL.
                </p>
              </div>
            </div>

            <div className={styles.footerColumns}>
              <div>
                <h3>Navigation</h3>
                {footerNavigation.map((item) => (
                  <a key={item.label} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </div>
              <div>
                <h3>Profile</h3>
                {footerProfile.map((item) => (
                  <Link key={item.label} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.footerRule} />

          <div className={styles.footerBottom}>
            <p className={styles.footerNote}>
              Anifire keeps the landing focused on conversion while the streaming
              route handles the watch experience.
              <a href="mailto:hello@anifire.app" className={styles.footerMail}>
                <Mail size={15} /> hello@anifire.app
              </a>
            </p>
            <div className={styles.socials} aria-label="Social links">
              <a href="/stream" aria-label="Anifire on Telegram">
                <Send size={18} />
              </a>
              <a href="/stream" aria-label="Anifire on Discord">
                <MessageCircle size={18} />
              </a>
              <a href="/stream" aria-label="Anifire website">
                <Globe size={18} />
              </a>
              <a href="/stream" aria-label="Anifire live">
                <Flame size={18} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
