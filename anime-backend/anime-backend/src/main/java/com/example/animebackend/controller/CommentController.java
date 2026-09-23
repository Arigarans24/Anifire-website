package com.example.animebackend.controller;

import com.example.animebackend.auth.entity.Role;
import com.example.animebackend.dto.CommentRequest;
import com.example.animebackend.dto.CommentResponse;
import com.example.animebackend.service.CommentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class CommentController {

    private final CommentService service;

    public CommentController(CommentService service) {
        this.service = service;
    }

    @GetMapping("/animes/{animeId}/comments")
    public List<CommentResponse> listForAnime(@PathVariable Long animeId) {
        return service.listForAnime(animeId);
    }

    @PostMapping("/animes/{animeId}/comments")
    public CommentResponse create(
            @PathVariable Long animeId,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.create(animeId, request, userId(jwt));
    }

    @PutMapping("/comments/{id}")
    public CommentResponse update(
            @PathVariable Long id,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.update(id, request, userId(jwt), role(jwt));
    }

    @DeleteMapping("/comments/{id}")
    public void delete(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        service.softDelete(id, userId(jwt), role(jwt));
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }

    private static Role role(Jwt jwt) {
        return jwt.getClaimAsStringList("roles").contains(Role.ADMIN.name()) ? Role.ADMIN : Role.USER;
    }
}
