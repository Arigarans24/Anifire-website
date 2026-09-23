package com.example.animebackend.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.*;

/**
 * Application user / credential record.
 * Passwords are never stored in clear text — only the Argon2id hash (which
 * embeds its own per-password salt). Soft-delete is honored via {@code isDeleted}.
 */
@Entity
@Table(
        name = "app_users",
        indexes = @Index(name = "ux_app_users_email", columnList = "email", unique = true))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Stored normalized (trimmed, lower-cased). */
    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Role role = Role.USER;

    @Builder.Default
    private boolean emailVerified = false;

    @Builder.Default
    private boolean isDeleted = false;

    /** Consecutive failed logins; reset on success. */
    @Builder.Default
    private int failedAttempts = 0;

    /** When set in the future, login is temporarily locked. */
    private Instant lockedUntil;

    private Instant lastLoginAt;

    // ───────────────────────── Profile ─────────────────────────
    @Column(length = 600)
    private String bio;

    private String location;

    private LocalDate birthday;

    /** Avatar / banner image URLs (may point at uploaded or remote images). */
    private String avatarUrl;

    private String bannerUrl;

    @Builder.Default
    private int level = 1;

    @Builder.Default
    private int points = 0;

    @Builder.Default
    private int profileViews = 0;

    @Builder.Default
    private int likes = 0;

    @Builder.Default
    private int friends = 0;

    @Builder.Default
    private int posts = 0;

    @Builder.Default
    private int commentsCount = 0;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant updatedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
