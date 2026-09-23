package com.example.animebackend.controller;

import com.example.animebackend.dto.PlayerSourceResponse;
import com.example.animebackend.service.VideoSourceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/animes")
public class VideoSourceController {

    private final VideoSourceService service;

    public VideoSourceController(VideoSourceService service) {
        this.service = service;
    }

    @GetMapping("/{animeId}/episodes/{episode}/source")
    public PlayerSourceResponse source(@PathVariable Long animeId, @PathVariable int episode) {
        return service.source(animeId, episode);
    }
}
