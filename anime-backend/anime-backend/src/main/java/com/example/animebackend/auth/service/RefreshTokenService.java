package com.example.animebackend.auth.service;

import com.example.animebackend.auth.config.JwtProperties;
import com.example.animebackend.auth.entity.RefreshToken;
import com.example.animebackend.auth.repository.RefreshTokenRepository;
import com.example.animebackend.auth.security.Tokens;
import com.example.animebackend.auth.web.ApiException;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Opaque, single-use refresh tokens with rotation + reuse detection.
 *
 * <p>Each login starts a token <em>family</em>. Every refresh rotates the token and
 * revokes the previous one. If a revoked token is ever presented again, it means a
 * copy leaked and is being replayed — we revoke the entire family, forcing re-auth.
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    public record Rotation(Long userId, String newRawToken) {}

    private final RefreshTokenRepository repo;
    private final JwtProperties jwtProps;

    public RefreshTokenService(RefreshTokenRepository repo, JwtProperties jwtProps) {
        this.repo = repo;
        this.jwtProps = jwtProps;
    }

    @Transactional
    public String startSession(Long userId, String ip, String userAgent) {
        return persist(userId, UUID.randomUUID().toString(), ip, userAgent);
    }

    @Transactional
    public Rotation rotate(String rawToken, String ip, String userAgent) {
        RefreshToken current = repo.findByTokenHash(Tokens.sha256Hex(rawToken))
                .orElseThrow(RefreshTokenService::expired);

        if (current.isRevoked()) {
            // Replay of a rotated/revoked token → likely theft. Burn the lineage.
            repo.revokeFamily(current.getFamilyId());
            log.warn("Refresh token REUSE detected — userId={} family={}. Family revoked.",
                    current.getUserId(), current.getFamilyId());
            throw ApiException.unauthorized("token_reuse_detected",
                    "Your session was invalidated for security. Please sign in again.");
        }
        if (current.getExpiresAt().isBefore(Instant.now())) {
            current.setRevoked(true);
            repo.save(current);
            throw expired();
        }

        String newRaw = Tokens.random();
        String newHash = Tokens.sha256Hex(newRaw);
        current.setRevoked(true);
        current.setReplacedByHash(newHash);
        repo.save(current);

        repo.save(RefreshToken.builder()
                .userId(current.getUserId())
                .tokenHash(newHash)
                .familyId(current.getFamilyId())
                .expiresAt(Instant.now().plus(jwtProps.refreshTtl()))
                .userAgent(truncate(userAgent, 512))
                .ipAddress(truncate(ip, 64))
                .build());

        return new Rotation(current.getUserId(), newRaw);
    }

    @Transactional
    public void revoke(String rawToken) {
        repo.findByTokenHash(Tokens.sha256Hex(rawToken)).ifPresent(t -> {
            t.setRevoked(true);
            repo.save(t);
        });
    }

    @Transactional
    public void revokeAllForUser(Long userId) {
        repo.revokeAllForUser(userId);
    }

    private String persist(Long userId, String familyId, String ip, String userAgent) {
        String raw = Tokens.random();
        repo.save(RefreshToken.builder()
                .userId(userId)
                .tokenHash(Tokens.sha256Hex(raw))
                .familyId(familyId)
                .expiresAt(Instant.now().plus(jwtProps.refreshTtl()))
                .userAgent(truncate(userAgent, 512))
                .ipAddress(truncate(ip, 64))
                .build());
        return raw;
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static ApiException expired() {
        return ApiException.unauthorized("invalid_refresh", "Session expired. Please sign in again.");
    }
}
