"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Flame, Lock, Mail } from "lucide-react";
import Field from "@/components/auth/Field";
import SocialButtons, { type Provider } from "@/components/auth/SocialButtons";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthError } from "@/lib/auth-client";
import styles from "../auth.module.css";

type Busy = null | "email" | Provider;

function nextPath() {
  if (typeof window === "undefined") return "/stream";
  const value = new URLSearchParams(window.location.search).get("next");
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/stream";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, socialLogin } = useAuth();
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace(nextPath());
  }, [loading, router, user]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    setBusy("email");
    setNotice(null);
    try {
      await login(email, password);
      router.replace(nextPath());
    } catch (err) {
      setBusy(null);
      setNotice(err instanceof AuthError ? err.message : "Something went wrong. Try again.");
    }
  }

  async function handleProvider(provider: Provider) {
    setBusy(provider);
    setNotice(null);
    try {
      await socialLogin(provider);
      router.replace(nextPath());
    } catch (err) {
      setBusy(null);
      setNotice(err instanceof AuthError ? err.message : "Social sign-in failed. Try again.");
    }
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || busy !== null) return;
    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT") return;
    e.preventDefault();
    e.currentTarget.requestSubmit();
  }

  return (
    <div className={styles.card}>
      <Link href="/" className={styles.logoLink}>
        <span className={styles.logoMark}>
          <Flame size={18} fill="currentColor" />
        </span>
        <span className={styles.logoText}>Anifire</span>
      </Link>

      <h1 className={styles.head}>Welcome back</h1>
      <p className={styles.sub}>Sign in to pick up where you left off.</p>

      {notice ? (
        <div className={`${styles.notice} ${styles.noticeInfo}`}>{notice}</div>
      ) : null}

      <SocialButtons
        onProvider={handleProvider}
        pending={busy && busy !== "email" ? busy : null}
        disabled={busy === "email"}
      />

      <div className={styles.divider}>or continue with email</div>

      <form className={styles.form} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
        <Field
          id="email"
          label="Email"
          type="email"
          icon={<Mail size={17} />}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          id="password"
          label="Password"
          type="password"
          icon={<Lock size={17} />}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div className={styles.row}>
          <label className={styles.check}>
            <input type="checkbox" defaultChecked />
            <span className={styles.checkBox}>
              <Check size={13} strokeWidth={3} />
            </span>
            Remember me
          </label>
          <Link href="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
        </div>

        <button className={styles.submit} type="submit" disabled={busy !== null}>
          {busy === "email" ? <span className={styles.spinner} /> : "Sign in"}
        </button>
      </form>

      <p className={styles.alt}>
        New to Anifire? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
