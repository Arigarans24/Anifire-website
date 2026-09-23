package com.example.animebackend.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** Body carrying a single opaque token (email verification). */
public record TokenRequest(@NotBlank String token) {
}
