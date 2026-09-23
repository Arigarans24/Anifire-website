package com.example.animebackend.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

/**
 * Server-side record of a refresh token. We never store the raw token — only its
 * SHA-256 hash, so a DB leak can't be replayed. Tokens belong to a {@code familyId}
 * so that detecting reuse of a rotated token lets us revoke the whole lineage.
 */
@Entity
@Table(
        name = "refresh_tokens",
        indexes = {
            @Index(name = "ux_refresh_token_hash", columnList = "tokenHash", unique = true),
            @Index(name = "ix_refresh_family", columnList = "familyId")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false, length = 36)
    private String familyId;

    @Column(nullable = false)
    private Instant expiresAt;

    @Builder.Default
    private boolean revoked = false;

    /** Hash of the token that superseded this one during rotation. */
    @Column(length = 64)
    private String replacedByHash;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(length = 512)
    private String userAgent;

    @Column(length = 64)
    private String ipAddress;
}
