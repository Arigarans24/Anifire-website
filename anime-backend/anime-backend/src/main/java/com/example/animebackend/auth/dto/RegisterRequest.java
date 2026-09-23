package com.example.animebackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 254) String email,
        // 12-char minimum aligns with NIST 800-63B guidance; cap length to bound
        // Argon2 work and prevent long-password DoS.
        @NotBlank @Size(min = 12, max = 128) String password,
        @Size(max = 50) String displayName) {
}
