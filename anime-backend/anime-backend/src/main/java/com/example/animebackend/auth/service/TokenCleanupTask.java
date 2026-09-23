package com.example.animebackend.auth.service;

import com.example.animebackend.auth.repository.RefreshTokenRepository;
import com.example.animebackend.auth.repository.VerificationTokenRepository;
import com.example.animebackend.auth.security.RateLimiterService;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Hourly housekeeping: drop expired tokens and stale rate-limit buckets. */
@Component
public class TokenCleanupTask {

    private final RefreshTokenRepository refreshTokens;
    private final VerificationTokenRepository verificationTokens;
    private final RateLimiterService rateLimiter;

    public TokenCleanupTask(
            RefreshTokenRepository refreshTokens,
            VerificationTokenRepository verificationTokens,
            RateLimiterService rateLimiter) {
        this.refreshTokens = refreshTokens;
        this.verificationTokens = verificationTokens;
        this.rateLimiter = rateLimiter;
    }

    @Scheduled(fixedRate = 3_600_000L)
    @Transactional
    public void purge() {
        Instant now = Instant.now();
        refreshTokens.deleteExpired(now);
        verificationTokens.deleteExpired(now);
        rateLimiter.evictExpired();
    }
}
