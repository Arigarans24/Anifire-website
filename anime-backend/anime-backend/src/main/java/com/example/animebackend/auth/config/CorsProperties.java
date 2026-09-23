package com.example.animebackend.auth.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** CORS settings (prefix {@code anifire.cors}). */
@ConfigurationProperties(prefix = "anifire.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
