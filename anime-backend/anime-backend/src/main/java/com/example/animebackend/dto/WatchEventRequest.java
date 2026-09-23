package com.example.animebackend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Payload the player sends when a user starts watching an episode. */
public record WatchEventRequest(
        @NotBlank @Size(max = 120) String animeKey,
        @Size(max = 300) String animeTitle,
        int episode,
        @Size(max = 60) String provider) {}
