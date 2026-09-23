package com.example.animebackend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "animes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Anime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long malId; // MyAnimeList original ID
    private String title;

    @Column(length = 2000)
    private String synopsis;

    private String imageUrl;
    private Double rating;

    @ManyToMany
    @JoinTable(
            name = "anime_categories",
            joinColumns = @JoinColumn(name = "anime_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    @Builder.Default
    private Set<Category> categories = new LinkedHashSet<>();

    @Builder.Default
    private boolean isDeleted = false; // Logical deletion flag

    @Builder.Default
    private LocalDateTime creationDate = LocalDateTime.now(); // Record creation timestamp

    private Long creatorUserId; // User ID who created this record
}
