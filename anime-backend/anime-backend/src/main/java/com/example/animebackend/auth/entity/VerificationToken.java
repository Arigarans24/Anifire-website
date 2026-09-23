package com.example.animebackend.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

/**
 * Single-use token for email verification or password reset. Only the SHA-256
 * hash of the raw token is stored; the raw value travels only in the emailed link.
 */
@Entity
@Table(
        name = "verification_tokens",
        indexes = @Index(name = "ux_verification_token_hash", columnList = "tokenHash", unique = true))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private TokenType type;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant usedAt;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
