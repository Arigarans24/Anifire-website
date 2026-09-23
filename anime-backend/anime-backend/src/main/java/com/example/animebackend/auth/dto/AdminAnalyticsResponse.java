package com.example.animebackend.auth.dto;

import java.util.List;

public record AdminAnalyticsResponse(
        UserMetrics users,
        ContentMetrics content,
        WatchMetrics watch,
        List<CategoryMetric> categories,
        List<ActivityMetric> activity,
        List<TopAnimeMetric> topAnime,
        List<DailyViewMetric> dailyViews,
        List<RecentViewMetric> recentViews) {

    public record WatchMetrics(
            long totalViews,
            long viewsToday,
            long views7d,
            long uniqueViewers,
            long uniqueViewers7d) {
    }

    public record TopAnimeMetric(
            String animeKey,
            String title,
            long views) {
    }

    public record DailyViewMetric(
            String date,
            long views) {
    }

    public record RecentViewMetric(
            String user,
            String animeKey,
            String animeTitle,
            int episode,
            String provider,
            String watchedAt) {
    }

    public record UserMetrics(
            long total,
            long admins,
            long regularUsers,
            long verified,
            long unverified) {
    }

    public record ContentMetrics(
            long anime,
            long categories,
            long comments,
            long averageCommentsPerAnime) {
    }

    public record CategoryMetric(
            Long id,
            String name,
            long animeCount) {
    }

    public record ActivityMetric(
            String label,
            long value) {
    }
}
