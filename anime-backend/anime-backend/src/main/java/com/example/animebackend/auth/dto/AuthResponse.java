package com.example.animebackend.auth.dto;

/** Returned on successful login/refresh. The refresh token is set as an httpOnly cookie, not here. */
public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserDto user) {
}
