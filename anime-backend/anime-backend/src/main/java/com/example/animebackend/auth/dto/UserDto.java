package com.example.animebackend.auth.dto;

import com.example.animebackend.auth.entity.AppUser;

public record UserDto(
        Long id,
        String email,
        String displayName,
        String role,
        boolean emailVerified) {

    public static UserDto from(AppUser u) {
        return new UserDto(
                u.getId(),
                u.getEmail(),
                u.getDisplayName(),
                u.getRole().name(),
                u.isEmailVerified());
    }
}
