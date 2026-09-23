package com.example.animebackend.dto;

import com.example.animebackend.entity.Category;
import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String name,
        boolean deleted,
        LocalDateTime creationDate) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.isDeleted(),
                category.getCreationDate());
    }
}
