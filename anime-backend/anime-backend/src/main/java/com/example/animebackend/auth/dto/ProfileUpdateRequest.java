package com.example.animebackend.auth.dto;

import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Editable profile fields. All optional — only non-null fields are applied,
 * so the client can send partial updates.
 */
public record ProfileUpdateRequest(
        @Size(max = 60) String displayName,
        @Size(max = 600) String bio,
        @Size(max = 120) String location,
        LocalDate birthday,
        @Size(max = 500) String avatarUrl,
        @Size(max = 500) String bannerUrl) {}
