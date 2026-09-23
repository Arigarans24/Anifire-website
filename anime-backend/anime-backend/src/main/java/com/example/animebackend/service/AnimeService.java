package com.example.animebackend.service;

import com.example.animebackend.dto.AnimeRequest;
import com.example.animebackend.dto.AnimeResponse;
import com.example.animebackend.dto.JikanResponse;
import com.example.animebackend.dto.PagedResponse;
import com.example.animebackend.entity.Anime;
import com.example.animebackend.entity.Category;
import com.example.animebackend.repository.AnimeRepository;
import com.example.animebackend.repository.CategoryRepository;
import com.example.animebackend.auth.web.ApiException;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@Service
public class AnimeService {

    private static final Logger log = LoggerFactory.getLogger(AnimeService.class);
    private static final int MAX_PAGE_SIZE = 50;

    private final AnimeRepository repository;
    private final CategoryRepository categoryRepository;
    private final RestClient restClient;

    public AnimeService(AnimeRepository repository, CategoryRepository categoryRepository) {
        this.repository = repository;
        this.categoryRepository = categoryRepository;
        // Initialize the client with Jikan API base URL
        this.restClient = RestClient.create("https://api.jikan.moe/v4");
    }

    @Transactional(readOnly = true)
    public List<AnimeResponse> listAll() {
        return repository.findAllByIsDeletedFalse().stream()
                .map(AnimeResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AnimeResponse getById(Long id) {
        return AnimeResponse.from(findActive(id));
    }

    @Transactional(readOnly = true)
    public PagedResponse<AnimeResponse> search(String query, Long categoryId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), MAX_PAGE_SIZE);
        PageRequest pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(Sort.Direction.DESC, "creationDate"));

        Specification<Anime> spec = notDeleted()
                .and(titleContains(query))
                .and(inCategory(categoryId));

        return PagedResponse.from(repository.findAll(spec, pageable).map(AnimeResponse::from));
    }

    @Transactional
    public AnimeResponse create(AnimeRequest request, Long creatorUserId) {
        Anime anime = Anime.builder()
                .title(request.title().trim())
                .synopsis(trimToNull(request.description()))
                .imageUrl(trimToNull(request.imageUrl()))
                .rating(request.rating())
                .creatorUserId(creatorUserId)
                .creationDate(LocalDateTime.now())
                .isDeleted(false)
                .build();
        anime.setCategories(resolveCategories(request.categoryIds()));
        return AnimeResponse.from(repository.save(anime));
    }

    @Transactional
    public AnimeResponse update(Long id, AnimeRequest request) {
        Anime anime = findActive(id);
        anime.setTitle(request.title().trim());
        anime.setSynopsis(trimToNull(request.description()));
        anime.setImageUrl(trimToNull(request.imageUrl()));
        anime.setRating(request.rating());
        anime.setCategories(resolveCategories(request.categoryIds()));
        return AnimeResponse.from(repository.save(anime));
    }

    @Transactional
    public void softDelete(Long id) {
        Anime anime = findActive(id);
        anime.setDeleted(true);
        repository.save(anime);
        log.info("Anime soft-deleted: id={}", id);
    }

    /**
     * Fetches top anime from Jikan API and saves them to the local database.
     */
    /** How many Jikan /top/anime pages to seed (25 titles per page). */
    private static final int SEED_PAGES = 6;

    @Transactional
    public void fetchAndSaveTopAnime() {
        log.info("Fetching top anime from Jikan API ({} pages)", SEED_PAGES);

        // Categories are created on demand from each title's real genres/themes,
        // cached by lower-cased name so we never duplicate a category.
        Map<String, Category> categoryCache = new HashMap<>();
        Category topAnime = getOrCreateCategory(categoryCache, "Top Anime");

        List<Anime> animesToSave = new ArrayList<>();
        for (int page = 1; page <= SEED_PAGES; page++) {
            JikanResponse response = fetchPageWithRetry(page);
            if (response == null || response.getData() == null || response.getData().isEmpty()) {
                if (page == 1) {
                    log.warn("Jikan unavailable — seed skipped, will retry on next restart");
                }
                break;
            }

            for (JikanResponse.JikanAnime jikanAnime : response.getData()) {
                LinkedHashSet<Category> cats = new LinkedHashSet<>();
                cats.add(topAnime);
                addGenres(categoryCache, cats, jikanAnime.getGenres());
                addGenres(categoryCache, cats, jikanAnime.getThemes());
                addGenres(categoryCache, cats, jikanAnime.getDemographics());

                animesToSave.add(Anime.builder()
                        .malId(jikanAnime.getMalId())
                        .title(jikanAnime.getTitle())
                        .synopsis(jikanAnime.getSynopsis())
                        .rating(jikanAnime.getScore())
                        .imageUrl(imageUrl(jikanAnime))
                        .categories(cats)
                        .isDeleted(false)
                        .creationDate(LocalDateTime.now())
                        .build());
            }

            // Respect Jikan's rate limit (~3 req/s) between pages.
            try {
                Thread.sleep(700);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            }
        }

        repository.saveAll(animesToSave);
        log.info("Seeded {} anime across {} categories",
                animesToSave.size(), categoryCache.size());
    }

    /** Fetch one /top/anime page, retrying transient failures (e.g. Jikan 503). */
    private JikanResponse fetchPageWithRetry(int page) {
        for (int attempt = 1; attempt <= 4; attempt++) {
            try {
                return restClient.get()
                        .uri(uri -> uri.path("/top/anime").queryParam("page", page).build())
                        .retrieve()
                        .body(JikanResponse.class);
            } catch (RuntimeException ex) {
                log.warn("Jikan page {} attempt {}/4 failed: {}", page, attempt, ex.getMessage());
                try {
                    Thread.sleep(1500L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return null;
                }
            }
        }
        return null;
    }

    private void addGenres(
            Map<String, Category> cache,
            LinkedHashSet<Category> target,
            List<JikanResponse.JikanAnime.Genre> genres) {
        if (genres == null) {
            return;
        }
        for (JikanResponse.JikanAnime.Genre g : genres) {
            if (g.getName() != null && !g.getName().isBlank()) {
                target.add(getOrCreateCategory(cache, g.getName().trim()));
            }
        }
    }

    private Category getOrCreateCategory(Map<String, Category> cache, String name) {
        return cache.computeIfAbsent(
                name.toLowerCase(),
                key -> categoryRepository.findByNameIgnoreCaseAndIsDeletedFalse(name)
                        .orElseGet(() -> categoryRepository.save(Category.builder().name(name).build())));
    }

    private Anime findActive(Long id) {
        return repository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> ApiException.badRequest("anime_not_found", "Anime not found."));
    }

    private LinkedHashSet<Category> resolveCategories(Set<Long> categoryIds) {
        LinkedHashSet<Category> categories = new LinkedHashSet<>();
        if (categoryIds == null) {
            return categories;
        }
        for (Long categoryId : categoryIds) {
            Category category = categoryRepository.findByIdAndIsDeletedFalse(categoryId)
                    .orElseThrow(() -> ApiException.badRequest("category_not_found", "Category not found."));
            categories.add(category);
        }
        return categories;
    }

    private static Specification<Anime> notDeleted() {
        return (root, query, cb) -> cb.isFalse(root.get("isDeleted"));
    }

    /** Always-true predicate — Spring Data 4's {@code .and()} rejects nulls. */
    private static Specification<Anime> always() {
        return (root, query, cb) -> cb.conjunction();
    }

    private static Specification<Anime> titleContains(String value) {
        if (value == null || value.isBlank()) {
            return always();
        }
        String pattern = "%" + value.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("title")), pattern);
    }

    private static Specification<Anime> inCategory(Long categoryId) {
        if (categoryId == null) {
            return always();
        }
        return (root, query, cb) -> {
            Join<Anime, Category> category = root.join("categories", JoinType.INNER);
            return cb.and(
                    cb.equal(category.get("id"), categoryId),
                    cb.isFalse(category.get("isDeleted")));
        };
    }

    private static String imageUrl(JikanResponse.JikanAnime anime) {
        if (anime.getImages() == null || anime.getImages().getJpg() == null) {
            return null;
        }
        return anime.getImages().getJpg().getImageUrl();
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
