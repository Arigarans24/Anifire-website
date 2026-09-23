package com.example.animebackend.service;

import com.example.animebackend.auth.web.ApiException;
import com.example.animebackend.dto.PlayerSourceResponse;
import com.example.animebackend.entity.Anime;
import com.example.animebackend.repository.AnimeRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
public class VideoSourceService {

    private static final Logger log = LoggerFactory.getLogger(VideoSourceService.class);
    private static final String ANILIBERTY_BASE = "https://aniliberty.top/api/v1";
    private static final String DEMO_VIDEO =
            "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    private static final String USER_AGENT =
            "Anifire/1.0 (student project; local development)";

    private final AnimeRepository animeRepository;
    private final RestClient restClient = RestClient.create();

    public VideoSourceService(AnimeRepository animeRepository) {
        this.animeRepository = animeRepository;
    }

    @Transactional(readOnly = true)
    public PlayerSourceResponse source(Long animeId, int episodeNumber) {
        Anime anime = animeRepository.findByIdAndIsDeletedFalse(animeId)
                .orElseThrow(() -> ApiException.badRequest("anime_not_found", "Anime not found."));
        int episode = Math.max(1, episodeNumber);
        return anilibertySource(anime, episode);
    }

    private PlayerSourceResponse anilibertySource(Anime anime, int episodeNumber) {
        try {
            AniRelease release = findRelease(anime.getTitle());
            if (release == null) {
                return fallback(anime, episodeNumber, "AniLiberty release not found");
            }
            String idOrAlias = text(release.alias());
            if (idOrAlias == null) {
                idOrAlias = release.id() == null ? null : release.id().toString();
            }
            if (idOrAlias == null) {
                return fallback(anime, episodeNumber, "AniLiberty release has no id");
            }

            AniRelease detail = restClient.get()
                    .uri(URI.create(ANILIBERTY_BASE + "/anime/releases/" + url(idOrAlias)))
                    .header("Accept", "application/json")
                    .header("User-Agent", USER_AGENT)
                    .retrieve()
                    .body(AniRelease.class);
            List<AniEpisode> episodes = detail == null ? null : detail.episodes();
            if (episodes == null || episodes.isEmpty()) {
                return fallback(anime, episodeNumber, "AniLiberty release has no episodes");
            }

            AniEpisode episode = selectEpisode(episodes, episodeNumber);
            List<PlayerSourceResponse.QualityResponse> qualities = qualities(episode);
            if (qualities.isEmpty()) {
                return fallback(anime, episodeNumber, "AniLiberty episode has no HLS source");
            }
            String src = qualities.get(0).src();

            String title = text(detail.name() == null ? null : detail.name().english());
            if (title == null) {
                title = text(detail.name() == null ? null : detail.name().main());
            }
            if (title == null) {
                title = anime.getTitle();
            }

            int total = Math.max(episodeNumber, episodes.size());
            return response(
                    anime,
                    episodeNumber,
                    total,
                    title,
                    text(detail.name() == null ? null : detail.name().main()),
                    src,
                    qualities,
                    text(episode.name()),
                    chapters(episode),
                    "AniLiberty");
        } catch (Exception e) {
            log.warn("AniLiberty video source failed for anime id={} title='{}': {}",
                    anime.getId(), anime.getTitle(), e.getMessage());
            return fallback(anime, episodeNumber, "AniLiberty unavailable: " + e.getClass().getSimpleName());
        }
    }

    private AniRelease findRelease(String title) {
        AniRelease[] results = restClient.get()
                .uri(URI.create(ANILIBERTY_BASE + "/app/search/releases?query=" + url(title)))
                .header("Accept", "application/json")
                .header("User-Agent", USER_AGENT)
                .retrieve()
                .body(AniRelease[].class);
        if (results == null || results.length == 0) {
            return null;
        }
        for (AniRelease candidate : results) {
            String english = text(candidate.name() == null ? null : candidate.name().english());
            String main = text(candidate.name() == null ? null : candidate.name().main());
            if (containsSameTitle(english, title) || containsSameTitle(main, title)) {
                return candidate;
            }
        }
        return results[0];
    }

    private static boolean containsSameTitle(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
        String a = normalize(left);
        String b = normalize(right);
        return a.contains(b) || b.contains(a);
    }

    private static String normalize(String value) {
        return value.toLowerCase()
                .replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}]+", " ")
                .trim();
    }

    private static AniEpisode selectEpisode(List<AniEpisode> episodes, int episodeNumber) {
        for (AniEpisode episode : episodes) {
            if (Math.round(number(episode.ordinal(), -1)) == episodeNumber) {
                return episode;
            }
        }
        int index = Math.min(Math.max(episodeNumber - 1, 0), episodes.size() - 1);
        return episodes.get(index);
    }

    private PlayerSourceResponse fallback(Anime anime, int episodeNumber, String reason) {
        log.info("Using demo player source for anime id={}: {}", anime.getId(), reason);
        return response(
                anime,
                episodeNumber,
                Math.max(episodeNumber, 12),
                anime.getTitle(),
                "Demo source",
                DEMO_VIDEO,
                demoQualities(),
                "Demo playback",
                List.of(
                        new PlayerSourceResponse.ChapterResponse(8, 48, "intro", "Intro"),
                        new PlayerSourceResponse.ChapterResponse(540, 580, "outro", "Outro")),
                "Demo fallback");
    }

    private static PlayerSourceResponse response(
            Anime anime,
            int episodeNumber,
            int total,
            String title,
            String subtitle,
            String src,
            List<PlayerSourceResponse.QualityResponse> qualities,
            String episodeTitle,
            List<PlayerSourceResponse.ChapterResponse> chapters,
            String provider) {
        String base = "/watch/" + anime.getId();
        Integer prev = episodeNumber > 1 ? episodeNumber - 1 : null;
        Integer next = episodeNumber < total ? episodeNumber + 1 : null;
        return new PlayerSourceResponse(
                anime.getId() + "-" + episodeNumber + "-" + provider,
                base + "?ep=" + episodeNumber,
                title,
                subtitle,
                "Episode " + episodeNumber,
                episodeTitle,
                src,
                qualities,
                anime.getImageUrl(),
                demoTracks(),
                chapters,
                prev == null ? null : base + "?ep=" + prev,
                next == null ? null : base + "?ep=" + next,
                "/anime/" + anime.getId(),
                provider);
    }

    private static List<PlayerSourceResponse.QualityResponse> qualities(AniEpisode episode) {
        List<PlayerSourceResponse.QualityResponse> qualities = new ArrayList<>();
        addQuality(qualities, "1080p", 1080, episode.hls_1080());
        addQuality(qualities, "720p", 720, episode.hls_720());
        addQuality(qualities, "480p", 480, episode.hls_480());
        return qualities;
    }

    private static void addQuality(
            List<PlayerSourceResponse.QualityResponse> qualities,
            String label,
            int height,
            String src) {
        String value = text(src);
        if (value != null) {
            qualities.add(new PlayerSourceResponse.QualityResponse(label, height, value));
        }
    }

    private static List<PlayerSourceResponse.ChapterResponse> chapters(AniEpisode episode) {
        List<PlayerSourceResponse.ChapterResponse> chapters = new ArrayList<>();
        addChapter(chapters, episode.opening(), "intro", "Пропустить опенинг");
        addChapter(chapters, episode.ending(), "outro", "Пропустить эндинг");
        return chapters;
    }

    private static void addChapter(
            List<PlayerSourceResponse.ChapterResponse> chapters,
            AniSkip node,
            String kind,
            String label) {
        double start = number(node == null ? null : node.start(), -1);
        double stop = number(node == null ? null : node.stop(), -1);
        if (start >= 0 && stop > start) {
            chapters.add(new PlayerSourceResponse.ChapterResponse(start, stop, kind, label));
        }
    }

    private static List<PlayerSourceResponse.SubtitleTrackResponse> demoTracks() {
        return List.of(
                new PlayerSourceResponse.SubtitleTrackResponse("ru", "Русский", "ru", List.of(
                        new PlayerSourceResponse.CueResponse(2, 6, "Видео загружено через API."),
                        new PlayerSourceResponse.CueResponse(6.5, 11, "Источник выбирается backend-сервисом."),
                        new PlayerSourceResponse.CueResponse(12, 17, "Если AniLiberty недоступен, включается fallback."))),
                new PlayerSourceResponse.SubtitleTrackResponse("en", "English", "en", List.of()));
    }

    private static List<PlayerSourceResponse.QualityResponse> demoQualities() {
        return List.of(
                new PlayerSourceResponse.QualityResponse("1080p", 1080, DEMO_VIDEO),
                new PlayerSourceResponse.QualityResponse("720p", 720, DEMO_VIDEO),
                new PlayerSourceResponse.QualityResponse("480p", 480, DEMO_VIDEO));
    }

    private static String text(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static double number(Number number, double fallback) {
        return number == null ? fallback : number.doubleValue();
    }

    private static String url(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AniRelease(
            Long id,
            String alias,
            AniName name,
            List<AniEpisode> episodes) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AniName(
            String main,
            String english) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AniEpisode(
            String name,
            Double ordinal,
            String hls_480,
            String hls_720,
            String hls_1080,
            AniSkip opening,
            AniSkip ending) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AniSkip(
            Double start,
            Double stop) {
    }
}
