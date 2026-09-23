"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flame, Lock, Mail, MailCheck, User } from "lucide-react";
import Field from "@/components/auth/Field";
import SocialButtons, { type Provider } from "@/components/auth/SocialButtons";
import { useAuth } from "@/components/auth/AuthProvider";
import { register, AuthError } from "@/lib/auth-client";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, login, socialLogin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/stream");
  }, [loading, router, user]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const displayName = String(data.get("name") ?? "");
    setBusy(true);
    setNotice(null);
    try {
      await register({ email, password, displayName });
      // Dev: accounts are auto-verified, so sign straight in. If sign-in fails
      // (e.g. email verification is enforced), fall back to the "check inbox"
      // confirmation screen.
      try {
        await login(email, password);
        router.replace("/stream");
      } catch {
        setBusy(false);
        setSentTo(email);
      }
    } catch (err) {
      setBusy(false);
      if (err instanceof AuthError) {
        setNotice(err.fields?.password ?? err.fields?.email ?? err.message);
      } else {
        setNotice("Something went wrong. Try again.");
      }
    }
  }

  async function handleProvider(provider: Provider) {
    setBusy(true);
    setNotice(null);
    try {
      await socialLogin(provider);
      router.replace("/stream");
    } catch (err) {
      setBusy(false);
      setNotice(err instanceof AuthError ? err.message : "Social sign-up failed. Try again.");
    }
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || busy) return;
    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT") return;
    e.preventDefault();
    e.currentTarget.requestSubmit();
  }

  if (sentTo) {
    return (
      <div className={styles.card}>
        <Link href="/" className={styles.logoLink}>
          <span className={styles.logoMark}>
            <Flame size={18} fill="currentColor" />
          </span>
          <span className={styles.logoText}>Anifire</span>
        </Link>
        <span className={styles.sentIcon}>
          <MailCheck size={28} />
        </span>
        <h1 className={styles.head}>Confirm your email</h1>
        <p className={styles.sub}>
          A verification link for <strong>{sentTo}</strong> was created. In dev
          there&apos;s no real email — open the <strong>backend terminal</strong> and
          click the logged <code>/verify-email?token=…</code> link, then sign in.
        </p>
        <Link href="/login" className={styles.back}>
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <Link href="/" className={styles.logoLink}>
        <span className={styles.logoMark}>
          <Flame size={18} fill="currentColor" />
        </span>
        <span className={styles.logoText}>Anifire</span>
      </Link>

      <h1 className={styles.head}>Create your account</h1>
      <p className={styles.sub}>Start streaming in under a minute.</p>

      {notice ? (
        <div className={`${styles.notice} ${styles.noticeErr}`}>{notice}</div>
      ) : null}

      <SocialButtons onProvider={handleProvider} disabled={busy} />

      <div className={styles.divider}>or sign up with email</div>

      <form className={styles.form} onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
        <Field
          id="name"
          label="Name"
          icon={<User size={17} />}
          placeholder="Your name"
          autoComplete="name"
          required={false}
        />
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
          placeholder="At least 12 characters"
          autoComplete="new-password"
        />

        <p className={styles.terms}>
          By creating an account you agree to our{" "}
          <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.
        </p>

        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? <span className={styles.spinner} /> : "Create account"}
        </button>
      </form>

      <p className={styles.alt}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
