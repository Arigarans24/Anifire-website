package com.example.animebackend.config;

import com.example.animebackend.repository.AnimeRepository;
import com.example.animebackend.service.AnimeService;
import com.example.animebackend.service.CommentService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "anifire.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(
            AnimeRepository repository,
            AnimeService animeService,
            CommentService commentService) {
        return args -> {
            // If the database is empty - seed it from Jikan
            if (repository.count() == 0) {
                animeService.fetchAndSaveTopAnime();
            } else {
                System.out.println("⚡ Database already has data. Skipping initialization.");
            }
            // Demo comments (incl. an admin message) on Frieren — runs once.
            commentService.seedDemoComments();
        };
    }
}
