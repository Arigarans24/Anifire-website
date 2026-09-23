package com.example.animebackend.dto;

import com.example.animebackend.entity.Anime;
import java.time.LocalDateTime;
import java.util.List;

public record AnimeResponse(
        Long id,
        Long malId,
        String title,
        String synopsis,
        String imageUrl,
        Double rating,
        boolean deleted,
        LocalDateTime creationDate,
        Long creatorUserId,
        List<CategoryResponse> categories) {

    public static AnimeResponse from(Anime anime) {
        List<CategoryResponse> categories = anime.getCategories().stream()
                .filter(category -> !category.isDeleted())
                .map(CategoryResponse::from)
                .toList();
        return new AnimeResponse(
                anime.getId(),
                anime.getMalId(),
                anime.getTitle(),
                anime.getSynopsis(),
                anime.getImageUrl(),
                anime.getRating(),
                anime.isDeleted(),
                anime.getCreationDate(),
                anime.getCreatorUserId(),
                categories);
    }
}
