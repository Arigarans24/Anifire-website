"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "@/app/(auth)/auth.module.css";

export default function Field({
  id,
  label,
  type = "text",
  icon,
  placeholder,
  autoComplete,
  required = true,
}: {
  id: string;
  label: string;
  type?: string;
  icon: ReactNode;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputWrap}>
        <span className={styles.inputIcon}>{icon}</span>
        <input
          id={id}
          name={id}
          type={inputType}
          className={styles.input}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
        />
        {isPassword ? (
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
    </div>
  );
}
