package com.example.animebackend.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

/**
 * A single "user watched an episode" event. These are the raw rows behind the
 * admin dashboard's view statistics (totals, unique viewers, top titles, recent
 * activity). Kept append-only — one row per playback start.
 */
@Entity
@Table(
        name = "watch_events",
        indexes = {
            @Index(name = "ix_watch_events_watched_at", columnList = "watchedAt"),
            @Index(name = "ix_watch_events_user", columnList = "userId"),
            @Index(name = "ix_watch_events_anime", columnList = "animeKey")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WatchEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Who watched (snapshotted so deleting a user keeps history readable). */
    private Long userId;

    private String userEmail;

    private String userName;

    /** Catalog id ("5114") or AniLiberty alias ("aishiteru-game-…"). */
    private String animeKey;

    private String animeTitle;

    private int episode;

    /** "AniLiberty", "local-fallback", etc. */
    private String provider;

    @Column(nullable = false)
    @Builder.Default
    private Instant watchedAt = Instant.now();
}
