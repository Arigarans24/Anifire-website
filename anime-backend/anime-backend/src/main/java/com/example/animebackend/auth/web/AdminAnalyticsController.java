package com.example.animebackend.auth.web;

import com.example.animebackend.auth.dto.AdminAnalyticsResponse;
import com.example.animebackend.auth.service.AdminAnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/analytics")
public class AdminAnalyticsController {

    private final AdminAnalyticsService service;

    public AdminAnalyticsController(AdminAnalyticsService service) {
        this.service = service;
    }

    @GetMapping
    public AdminAnalyticsResponse snapshot() {
        return service.snapshot();
    }
}
