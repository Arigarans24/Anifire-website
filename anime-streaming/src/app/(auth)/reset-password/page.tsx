"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Flame, Lock, ShieldCheck } from "lucide-react";
import Field from "@/components/auth/Field";
import { resetPassword, AuthError } from "@/lib/auth-client";
import styles from "../auth.module.css";

function ResetInner() {
  const token = useSearchParams().get("token");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setNotice("This reset link is invalid or missing.");
      return;
    }
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setBusy(true);
    setNotice(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setBusy(false);
      setNotice(
        err instanceof AuthError
          ? (err.fields?.password ?? err.message)
          : "Something went wrong. Try again."
      );
    }
  }

  if (done) {
    return (
      <div className={styles.card}>
        <span className={styles.sentIcon}>
          <ShieldCheck size={28} />
        </span>
        <h1 className={styles.head}>Password updated</h1>
        <p className={styles.sub}>
          Your password has been changed and all other sessions were signed out.
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

      <h1 className={styles.head}>Set a new password</h1>
      <p className={styles.sub}>Choose a strong password you don&apos;t use elsewhere.</p>

      {notice ? (
        <div className={`${styles.notice} ${styles.noticeErr}`}>{notice}</div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <Field
          id="password"
          label="New password"
          type="password"
          icon={<Lock size={17} />}
          placeholder="At least 12 characters"
          autoComplete="new-password"
        />
        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? <span className={styles.spinner} /> : "Update password"}
        </button>
      </form>

      <Link href="/login" className={styles.back}>
        <ArrowLeft size={16} /> Back to sign in
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
