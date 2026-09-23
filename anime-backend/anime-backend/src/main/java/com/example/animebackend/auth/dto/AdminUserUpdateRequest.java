package com.example.animebackend.auth.dto;

import com.example.animebackend.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record AdminUserUpdateRequest(
        @Size(max = 50) String displayName,
        @Email @Size(max = 254) String email,
        Role role,
        Boolean emailVerified,
        Boolean deleted) {
}
