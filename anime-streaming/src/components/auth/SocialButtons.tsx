"use client";

import { AppleIcon, GoogleIcon, MicrosoftIcon } from "./BrandIcons";
import styles from "@/app/(auth)/auth.module.css";

const PROVIDERS = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "microsoft", label: "Microsoft", Icon: MicrosoftIcon },
  { id: "apple", label: "Apple", Icon: AppleIcon },
] as const;

export type Provider = (typeof PROVIDERS)[number]["id"];

export default function SocialButtons({
  onProvider,
  pending = null,
  disabled = false,
}: {
  onProvider: (provider: Provider) => void;
  pending?: Provider | null;
  disabled?: boolean;
}) {
  return (
    <div className={styles.social}>
      {PROVIDERS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.socialBtn}
          onClick={() => onProvider(id)}
          disabled={disabled || pending !== null}
          aria-label={`Continue with ${label}`}
        >
          <Icon />
          {label}
        </button>
      ))}
    </div>
  );
}
