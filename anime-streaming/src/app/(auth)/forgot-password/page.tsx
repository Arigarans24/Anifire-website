"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Mail, MailCheck } from "lucide-react";
import Field from "@/components/auth/Field";
import { forgotPassword } from "@/lib/auth-client";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setBusy(true);
    // Backend always responds generically (no account enumeration), so we show
    // the same confirmation regardless of whether the email exists.
    await forgotPassword(email).catch(() => undefined);
    setBusy(false);
    setSentTo(email);
  }

  return (
    <div className={styles.card}>
      <Link href="/" className={styles.logoLink}>
        <span className={styles.logoMark}>
          <Flame size={18} fill="currentColor" />
        </span>
        <span className={styles.logoText}>Anifire</span>
      </Link>

      {sentTo ? (
        <>
          <span className={styles.sentIcon}>
            <MailCheck size={28} />
          </span>
          <h1 className={styles.head}>Check your inbox</h1>
          <p className={styles.sub}>
            If an account exists for <strong>{sentTo}</strong>, we&apos;ve sent a
            link to reset your password. It expires in 30 minutes.
          </p>
          <button
            type="button"
            className={styles.submit}
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </button>
          <Link href="/login" className={styles.back}>
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </>
      ) : (
        <>
          <h1 className={styles.head}>Reset your password</h1>
          <p className={styles.sub}>
            Enter the email tied to your account and we&apos;ll send you a reset
            link.
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <Field
              id="email"
              label="Email"
              type="email"
              icon={<Mail size={17} />}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <button className={styles.submit} type="submit" disabled={busy}>
              {busy ? <span className={styles.spinner} /> : "Send reset link"}
            </button>
          </form>

          <Link href="/login" className={styles.back}>
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
