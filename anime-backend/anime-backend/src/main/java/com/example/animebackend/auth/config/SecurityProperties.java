package com.example.animebackend.auth.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Password & login hardening settings (prefix {@code anifire.security}). */
@ConfigurationProperties(prefix = "anifire.security")
public record SecurityProperties(
        String pepper,
        boolean cookieSecure,
        int maxFailedAttempts,
        Duration lockDuration,
        boolean breachCheckEnabled,
        /** Dev convenience: mark new accounts verified immediately (no email step). */
        boolean autoVerifyEmail) {
}
