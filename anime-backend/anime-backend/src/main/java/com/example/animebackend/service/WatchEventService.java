package com.example.animebackend.service;

import com.example.animebackend.auth.repository.AppUserRepository;
import com.example.animebackend.dto.WatchEventRequest;
import com.example.animebackend.entity.WatchEvent;
import com.example.animebackend.repository.WatchEventRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Records playback events that power the admin dashboard's view statistics. */
@Service
public class WatchEventService {

    private final WatchEventRepository events;
    private final AppUserRepository users;

    public WatchEventService(WatchEventRepository events, AppUserRepository users) {
        this.events = events;
        this.users = users;
    }

    @Transactional
    public void record(Long userId, WatchEventRequest req) {
        // Snapshot the viewer so history survives a later account deletion.
        String email = null;
        String name = null;
        var user = users.findById(userId).orElse(null);
        if (user != null) {
            email = user.getEmail();
            name = user.getDisplayName();
        }

        events.save(
                WatchEvent.builder()
                        .userId(userId)
                        .userEmail(email)
                        .userName(name)
                        .animeKey(req.animeKey())
                        .animeTitle(req.animeTitle())
                        .episode(Math.max(1, req.episode()))
                        .provider(req.provider())
                        .watchedAt(Instant.now())
                        .build());
    }
}
