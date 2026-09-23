package com.example.animebackend.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Application-level settings (prefix {@code anifire.app}). */
@ConfigurationProperties(prefix = "anifire.app")
public record AppProperties(String frontendUrl) {
}
