package com.example.animebackend.controller;

import com.example.animebackend.dto.AnimeRequest;
import com.example.animebackend.dto.AnimeResponse;
import com.example.animebackend.dto.PagedResponse;
import com.example.animebackend.service.AnimeService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/animes")
// CORS is configured centrally in SecurityConfig (anifire.cors.allowed-origins).
public class AnimeController {

    private final AnimeService animeService;

    public AnimeController(AnimeService animeService) {
        this.animeService = animeService;
    }

    @GetMapping
    public List<AnimeResponse> getAllAnimes() {
        return animeService.listAll();
    }

    @GetMapping("/paged")
    public PagedResponse<AnimeResponse> searchAnimes(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return animeService.search(search, categoryId, page, size);
    }

    @GetMapping("/{id}")
    public AnimeResponse getAnime(@PathVariable Long id) {
        return animeService.getById(id);
    }

    @PostMapping
    public AnimeResponse createAnime(@Valid @RequestBody AnimeRequest request, @AuthenticationPrincipal Jwt jwt) {
        return animeService.create(request, Long.valueOf(jwt.getSubject()));
    }

    @PutMapping("/{id}")
    public AnimeResponse updateAnime(@PathVariable Long id, @Valid @RequestBody AnimeRequest request) {
        return animeService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void deleteAnime(@PathVariable Long id) {
        animeService.softDelete(id);
    }
}
