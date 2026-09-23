package com.example.animebackend.auth.security;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * Lightweight fixed-window rate limiter (per-instance, in memory).
 *
 * <p>Adequate for a single node; for a clustered deployment swap the backing map
 * for Redis (e.g. Bucket4j + Lettuce) so limits are shared across instances.
 */
@Service
public class RateLimiterService {

    private record Window(int count, Instant resetAt) {}

    private final ConcurrentHashMap<String, Window> buckets = new ConcurrentHashMap<>();

    /** @return true if the request is allowed; false if the limit is exceeded. */
    public boolean allow(String key, int maxRequests, Duration window) {
        Instant now = Instant.now();
        Window updated = buckets.compute(key, (k, current) -> {
            if (current == null || now.isAfter(current.resetAt())) {
                return new Window(1, now.plus(window));
            }
            return new Window(current.count() + 1, current.resetAt());
        });
        return updated.count() <= maxRequests;
    }

    public void evictExpired() {
        Instant now = Instant.now();
        buckets.entrySet().removeIf(e -> now.isAfter(e.getValue().resetAt()));
    }
}
