"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Flame, MailCheck, TriangleAlert } from "lucide-react";
import { verifyEmail, AuthError } from "@/lib/auth-client";
import styles from "../auth.module.css";

type Status = "pending" | "ok" | "error";

function VerifyInner() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>(token ? "pending" : "error");
  const [message, setMessage] = useState(
    token ? "" : "This verification link is invalid or missing."
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    verifyEmail(token)
      .then((r) => {
        if (!cancelled) {
          setStatus("ok");
          setMessage(r.message);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus("error");
          setMessage(err instanceof AuthError ? err.message : "Verification failed.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className={styles.card}>
      <Link href="/" className={styles.logoLink}>
        <span className={styles.logoMark}>
          <Flame size={18} fill="currentColor" />
        </span>
        <span className={styles.logoText}>Anifire</span>
      </Link>

      {status === "pending" ? (
        <>
          <h1 className={styles.head}>Verifying your email…</h1>
          <p className={styles.sub}>
            <span className={styles.spinner} style={{ borderTopColor: "var(--ember)" }} />
          </p>
        </>
      ) : status === "ok" ? (
        <>
          <span className={styles.sentIcon}>
            <MailCheck size={28} />
          </span>
          <h1 className={styles.head}>Email verified</h1>
          <p className={styles.sub}>{message} Welcome to Anifire.</p>
          <Link href="/login" className={styles.back}>
            <ArrowLeft size={16} /> Continue to sign in
          </Link>
        </>
      ) : (
        <>
          <span className={styles.sentIcon} style={{ color: "var(--gold)" }}>
            <TriangleAlert size={28} />
          </span>
          <h1 className={styles.head}>Verification failed</h1>
          <p className={styles.sub}>{message}</p>
          <Link href="/login" className={styles.back}>
            <ArrowLeft size={16} /> Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
