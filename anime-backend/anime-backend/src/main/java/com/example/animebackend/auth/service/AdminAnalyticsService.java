package com.example.animebackend.auth.service;

import com.example.animebackend.auth.dto.AdminAnalyticsResponse;
import com.example.animebackend.auth.entity.AppUser;
import com.example.animebackend.auth.entity.Role;
import com.example.animebackend.auth.repository.AppUserRepository;
import com.example.animebackend.entity.Anime;
import com.example.animebackend.entity.Category;
import com.example.animebackend.entity.WatchEvent;
import com.example.animebackend.repository.AnimeRepository;
import com.example.animebackend.repository.CategoryRepository;
import com.example.animebackend.repository.CommentRepository;
import com.example.animebackend.repository.WatchEventRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAnalyticsService {

    private final AppUserRepository userRepository;
    private final AnimeRepository animeRepository;
    private final CategoryRepository categoryRepository;
    private final CommentRepository commentRepository;
    private final WatchEventRepository watchEventRepository;

    public AdminAnalyticsService(
            AppUserRepository userRepository,
            AnimeRepository animeRepository,
            CategoryRepository categoryRepository,
            CommentRepository commentRepository,
            WatchEventRepository watchEventRepository) {
        this.userRepository = userRepository;
        this.animeRepository = animeRepository;
        this.categoryRepository = categoryRepository;
        this.commentRepository = commentRepository;
        this.watchEventRepository = watchEventRepository;
    }

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse snapshot() {
        List<AppUser> users = userRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc();
        List<Anime> anime = animeRepository.findAllByIsDeletedFalse();
        List<Category> categories = categoryRepository.findAllByIsDeletedFalseOrderByNameAsc();
        long comments = commentRepository.countByIsDeletedFalse();

        long admins = users.stream().filter(user -> user.getRole() == Role.ADMIN).count();
        long verified = users.stream().filter(AppUser::isEmailVerified).count();

        Map<Long, AdminAnalyticsResponse.CategoryMetric> categoryMetrics = new LinkedHashMap<>();
        for (Category category : categories) {
            categoryMetrics.put(category.getId(),
                    new AdminAnalyticsResponse.CategoryMetric(category.getId(), category.getName(), 0));
        }
        for (Anime item : anime) {
            for (Category category : item.getCategories()) {
                if (category.isDeleted()) {
                    continue;
                }
                AdminAnalyticsResponse.CategoryMetric current = categoryMetrics.get(category.getId());
                if (current != null) {
                    categoryMetrics.put(category.getId(),
                            new AdminAnalyticsResponse.CategoryMetric(
                                    current.id(),
                                    current.name(),
                                    current.animeCount() + 1));
                }
            }
        }

        AdminAnalyticsResponse.UserMetrics userMetrics = new AdminAnalyticsResponse.UserMetrics(
                users.size(),
                admins,
                users.size() - admins,
                verified,
                users.size() - verified);

        AdminAnalyticsResponse.ContentMetrics contentMetrics = new AdminAnalyticsResponse.ContentMetrics(
                anime.size(),
                categories.size(),
                comments,
                anime.isEmpty() ? 0 : Math.round((double) comments / anime.size()));

        List<AdminAnalyticsResponse.ActivityMetric> activity = List.of(
                new AdminAnalyticsResponse.ActivityMetric("Anime", anime.size()),
                new AdminAnalyticsResponse.ActivityMetric("Categories", categories.size()),
                new AdminAnalyticsResponse.ActivityMetric("Comments", comments),
                new AdminAnalyticsResponse.ActivityMetric("Users", users.size()));

        // ───────── Watch / view statistics (real playback events) ─────────
        Instant now = Instant.now();
        Instant dayAgo = now.minus(1, ChronoUnit.DAYS);
        Instant weekAgo = now.minus(7, ChronoUnit.DAYS);

        AdminAnalyticsResponse.WatchMetrics watch = new AdminAnalyticsResponse.WatchMetrics(
                watchEventRepository.count(),
                watchEventRepository.countByWatchedAtAfter(dayAgo),
                watchEventRepository.countByWatchedAtAfter(weekAgo),
                watchEventRepository.countDistinctViewers(),
                watchEventRepository.countDistinctViewersSince(weekAgo));

        List<AdminAnalyticsResponse.TopAnimeMetric> topAnime =
                watchEventRepository.topAnime(PageRequest.of(0, 8)).stream()
                        .map(row -> new AdminAnalyticsResponse.TopAnimeMetric(
                                (String) row[0],
                                row[1] != null ? (String) row[1] : (String) row[0],
                                ((Number) row[2]).longValue()))
                        .toList();

        List<AdminAnalyticsResponse.DailyViewMetric> dailyViews =
                watchEventRepository.dailyCountsSince(weekAgo).stream()
                        .map(row -> new AdminAnalyticsResponse.DailyViewMetric(
                                (String) row[0], ((Number) row[1]).longValue()))
                        .toList();

        List<AdminAnalyticsResponse.RecentViewMetric> recentViews =
                watchEventRepository.findTop20ByOrderByWatchedAtDesc().stream()
                        .map(this::toRecentView)
                        .toList();

        return new AdminAnalyticsResponse(
                userMetrics,
                contentMetrics,
                watch,
                categoryMetrics.values().stream().toList(),
                activity,
                topAnime,
                dailyViews,
                recentViews);
    }

    private AdminAnalyticsResponse.RecentViewMetric toRecentView(WatchEvent w) {
        String who = w.getUserName() != null && !w.getUserName().isBlank()
                ? w.getUserName()
                : (w.getUserEmail() != null ? w.getUserEmail() : "User #" + w.getUserId());
        return new AdminAnalyticsResponse.RecentViewMetric(
                who,
                w.getAnimeKey(),
                w.getAnimeTitle() != null ? w.getAnimeTitle() : w.getAnimeKey(),
                w.getEpisode(),
                w.getProvider(),
                w.getWatchedAt() != null ? w.getWatchedAt().toString() : null);
    }
}
