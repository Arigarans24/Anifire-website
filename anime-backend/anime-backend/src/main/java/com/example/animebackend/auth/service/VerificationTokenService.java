package com.example.animebackend.auth.service;

import com.example.animebackend.auth.entity.TokenType;
import com.example.animebackend.auth.entity.VerificationToken;
import com.example.animebackend.auth.repository.VerificationTokenRepository;
import com.example.animebackend.auth.security.Tokens;
import com.example.animebackend.auth.web.ApiException;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Issues and consumes single-use email-verification / password-reset tokens. */
@Service
public class VerificationTokenService {

    private static final Duration VERIFY_TTL = Duration.ofHours(24);
    private static final Duration RESET_TTL = Duration.ofMinutes(30);

    private final VerificationTokenRepository repo;

    public VerificationTokenService(VerificationTokenRepository repo) {
        this.repo = repo;
    }

    /** @return the raw token to embed in the emailed link (only its hash is stored). */
    @Transactional
    public String issue(Long userId, TokenType type) {
        Instant now = Instant.now();
        repo.consumePending(userId, type, now); // invalidate older pending tokens
        String raw = Tokens.random();
        repo.save(VerificationToken.builder()
                .userId(userId)
                .tokenHash(Tokens.sha256Hex(raw))
                .type(type)
                .expiresAt(now.plus(type == TokenType.PASSWORD_RESET ? RESET_TTL : VERIFY_TTL))
                .build());
        return raw;
    }

    /** @return the userId the token belongs to, marking it used. */
    @Transactional
    public Long consume(String rawToken, TokenType type) {
        VerificationToken token = repo.findByTokenHash(Tokens.sha256Hex(rawToken))
                .orElseThrow(VerificationTokenService::invalid);
        if (token.getType() != type
                || token.getUsedAt() != null
                || token.getExpiresAt().isBefore(Instant.now())) {
            throw invalid();
        }
        token.setUsedAt(Instant.now());
        repo.save(token);
        return token.getUserId();
    }

    private static ApiException invalid() {
        return ApiException.badRequest("invalid_token", "This link is invalid or has expired.");
    }
}
