package com.example.animebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record AnimeRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        String imageUrl,
        Double rating,
        Set<Long> categoryIds) {
}
