package com.example.animebackend.controller;

import com.example.animebackend.dto.WatchEventRequest;
import com.example.animebackend.service.WatchEventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Authenticated users post here when they start watching an episode. */
@RestController
@RequestMapping("/api/v1/watch-events")
public class WatchEventController {

    private final WatchEventService service;

    public WatchEventController(WatchEventService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void record(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody WatchEventRequest body) {
        service.record(Long.valueOf(jwt.getSubject()), body);
    }
}
