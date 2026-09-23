"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Edit3, MessageCircle, Save, Shield, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  addComment,
  deleteComment,
  fetchAiReview,
  fetchComments,
  updateComment,
  type Comment,
} from "@/data/animeApi";
import styles from "@/app/anime/[id]/anime.module.css";

export default function CommentsPanel({
  animeId,
  animeTitle = "",
  animeSynopsis = "",
}: {
  animeId: number;
  animeTitle?: string;
  animeSynopsis?: string;
}) {
  const { user } = useAuth();
  const [aiBusy, setAiBusy] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setComments(await fetchComments(animeId));
  }, [animeId]);

  useEffect(() => {
    let cancelled = false;
    fetchComments(animeId).then((items) => {
      if (!cancelled) setComments(items);
    });
    return () => {
      cancelled = true;
    };
  }, [animeId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await addComment(animeId, text);
      setText("");
      setNotice(null);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to add comment.");
    }
  }

  async function saveEdit(id: number) {
    if (!editingText.trim()) return;
    try {
      await updateComment(id, editingText);
      setEditingId(null);
      setEditingText("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to update comment.");
    }
  }

  async function remove(id: number) {
    try {
      await deleteComment(id);
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to delete comment.");
    }
  }

  async function generateAiReview() {
    setAiBusy(true);
    setNotice(null);
    try {
      const review = await fetchAiReview(animeTitle, animeSynopsis);
      if (review) setText(review);
      else setNotice("Local AI is unavailable (is Ollama running?).");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <section className={styles.comments}>
      <div className={styles.commentsHead}>
        <h2>
          <MessageCircle size={20} /> Comments
        </h2>
        <span>{comments.length} total</span>
      </div>

      {notice ? <div className={styles.commentNotice}>{notice}</div> : null}

      {user ? (
        <form className={styles.commentForm} onSubmit={submit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={
              user.role === "ADMIN"
                ? "Write a comment — it'll be tagged as Admin…"
                : "Write your comment…"
            }
          />
          <div className={styles.commentFormRow}>
            <button
              type="button"
              className={styles.aiReviewBtn}
              onClick={generateAiReview}
              disabled={aiBusy}
              title="Let the local AI draft a review/score for you"
            >
              <Sparkles size={14} /> {aiBusy ? "Generating…" : "AI review"}
            </button>
            <button type="submit">Add comment</button>
          </div>
        </form>
      ) : (
        <p className={styles.commentLogin}>
          <Link href="/login">Sign in</Link> to add a comment.
        </p>
      )}

      <div className={styles.commentList}>
        {comments.map((comment) => {
          const canManage =
            user?.role === "ADMIN" || comment.creatorUserId === user?.id;
          const editing = editingId === comment.id;
          return (
            <article key={comment.id} className={styles.commentCard}>
              <div className={styles.commentMeta}>
                <span className={styles.commentAuthor}>
                  {comment.authorName ||
                    (comment.creatorUserId
                      ? `User #${comment.creatorUserId}`
                      : "Anifire")}
                  {comment.authorRole === "ADMIN" ? (
                    <span className={styles.adminTag}>
                      <Shield size={11} /> Admin
                    </span>
                  ) : null}
                </span>
                <time>{new Date(comment.creationDate).toLocaleString()}</time>
              </div>
              {editing ? (
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  rows={3}
                />
              ) : (
                <p>{comment.description}</p>
              )}
              {canManage ? (
                <div className={styles.commentActions}>
                  {editing ? (
                    <button type="button" onClick={() => saveEdit(comment.id)}>
                      <Save size={14} /> Save
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditingText(comment.description);
                      }}
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                  )}
                  <button type="button" onClick={() => remove(comment.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
