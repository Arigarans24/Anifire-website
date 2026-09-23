package com.example.animebackend.auth.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** JWT signing/validation settings (prefix {@code anifire.jwt}). */
@ConfigurationProperties(prefix = "anifire.jwt")
public record JwtProperties(
        String issuer,
        String audience,
        Duration accessTtl,
        Duration refreshTtl,
        String jwkSet) {
}
