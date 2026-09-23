package com.example.animebackend.auth.web;

import com.example.animebackend.auth.dto.ProfileDto;
import com.example.animebackend.auth.dto.ProfileUpdateRequest;
import com.example.animebackend.auth.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Profile of the signed-in user. JWT subject carries the user id. */
@RestController
@RequestMapping("/api/v1/auth/me/profile")
public class ProfileController {

    private final ProfileService profiles;

    public ProfileController(ProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping
    public ProfileDto get(@AuthenticationPrincipal Jwt jwt) {
        return profiles.get(Long.valueOf(jwt.getSubject()));
    }

    @PutMapping
    public ProfileDto update(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ProfileUpdateRequest body) {
        return profiles.update(Long.valueOf(jwt.getSubject()), body);
    }

    @PostMapping("/randomize")
    public ProfileDto randomize(@AuthenticationPrincipal Jwt jwt) {
        return profiles.randomize(Long.valueOf(jwt.getSubject()));
    }
}
