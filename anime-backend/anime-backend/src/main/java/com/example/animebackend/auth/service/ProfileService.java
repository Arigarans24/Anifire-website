package com.example.animebackend.auth.service;

import com.example.animebackend.auth.dto.ProfileDto;
import com.example.animebackend.auth.dto.ProfileUpdateRequest;
import com.example.animebackend.auth.entity.AppUser;
import com.example.animebackend.auth.repository.AppUserRepository;
import com.example.animebackend.auth.web.ApiException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reads, updates and randomizes the signed-in user's profile. */
@Service
public class ProfileService {

    private final AppUserRepository users;

    public ProfileService(AppUserRepository users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public ProfileDto get(Long userId) {
        return ProfileDto.from(load(userId));
    }

    @Transactional
    public ProfileDto update(Long userId, ProfileUpdateRequest req) {
        AppUser u = load(userId);
        if (req.displayName() != null) u.setDisplayName(req.displayName().trim());
        if (req.bio() != null) u.setBio(req.bio());
        if (req.location() != null) u.setLocation(req.location());
        if (req.birthday() != null) u.setBirthday(req.birthday());
        if (req.avatarUrl() != null) u.setAvatarUrl(req.avatarUrl());
        if (req.bannerUrl() != null) u.setBannerUrl(req.bannerUrl());
        return ProfileDto.from(users.save(u));
    }

    /** Fill the profile with plausible random demo data and persist it. */
    @Transactional
    public ProfileDto randomize(Long userId) {
        AppUser u = load(userId);
        ThreadLocalRandom r = ThreadLocalRandom.current();

        String name = pick(NAMES, r) + r.nextInt(10, 9999);
        u.setDisplayName(name);
        u.setBio(pick(BIOS, r));
        u.setLocation(pick(CITIES, r));
        u.setBirthday(
                LocalDate.now(ZoneOffset.UTC)
                        .minusYears(r.nextInt(16, 39))
                        .minusDays(r.nextInt(0, 365)));
        u.setAvatarUrl(HEROES[r.nextInt(HEROES.length)]);
        u.setBannerUrl(HEROES[r.nextInt(HEROES.length)]);
        u.setLevel(r.nextInt(1, 60));
        u.setPoints(r.nextInt(0, 25000));
        u.setProfileViews(r.nextInt(0, 50000));
        u.setLikes(r.nextInt(0, 5000));
        u.setFriends(r.nextInt(0, 800));
        u.setPosts(r.nextInt(0, 400));
        u.setCommentsCount(r.nextInt(0, 2000));
        return ProfileDto.from(users.save(u));
    }

    private AppUser load(Long userId) {
        return users
                .findById(userId)
                .filter(x -> !x.isDeleted())
                .orElseThrow(
                        () ->
                                ApiException.unauthorized(
                                        "user_not_found", "Account no longer exists."));
    }

    private static String pick(List<String> xs, ThreadLocalRandom r) {
        return xs.get(r.nextInt(xs.size()));
    }

    private static final List<String> NAMES =
            List.of(
                    "Neylley", "Kuro", "Mira", "Akari", "Renji", "Yuki", "Sora", "Haru",
                    "Rei", "Kaito", "Nova", "Aiko", "Ryu", "Mei", "Hibiki");
    private static final List<String> CITIES =
            List.of(
                    "Tokyo, JP", "Osaka, JP", "Kyoto, JP", "Warsaw, PL", "Berlin, DE",
                    "Seoul, KR", "Taipei, TW", "Kyiv, UA", "Lisbon, PT", "Toronto, CA");
    private static final List<String> BIOS =
            List.of(
                    "Slice-of-life enjoyer. Always one episode away from sleeping on time.",
                    "Shonen at heart, seinen in practice. Will defend filler arcs.",
                    "Collector of OSTs and emotional damage.",
                    "Sub > dub, but I won't start a war over it. (I will.)",
                    "Rewatching the classics while the backlog grows infinitely.",
                    "Here for the fights, staying for the feels.");
    private static final String[] HEROES = {
        "/hero-1.png", "/hero-2.png", "/hero-3.png"
    };
}
