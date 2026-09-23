package com.example.animebackend.auth.dto;

import com.example.animebackend.auth.entity.AppUser;
import java.time.Instant;
import java.time.LocalDate;

/** Full profile view for the signed-in user's profile page. */
public record ProfileDto(
        Long id,
        String email,
        String displayName,
        String role,
        boolean emailVerified,
        String bio,
        String location,
        LocalDate birthday,
        String avatarUrl,
        String bannerUrl,
        int level,
        int points,
        int profileViews,
        int likes,
        int friends,
        int posts,
        int commentsCount,
        Instant createdAt,
        Instant lastLoginAt) {

    public static ProfileDto from(AppUser u) {
        return new ProfileDto(
                u.getId(),
                u.getEmail(),
                u.getDisplayName(),
                u.getRole().name(),
                u.isEmailVerified(),
                u.getBio(),
                u.getLocation(),
                u.getBirthday(),
                u.getAvatarUrl(),
                u.getBannerUrl(),
                u.getLevel(),
                u.getPoints(),
                u.getProfileViews(),
                u.getLikes(),
                u.getFriends(),
                u.getPosts(),
                u.getCommentsCount(),
                u.getCreatedAt(),
                u.getLastLoginAt());
    }
}
