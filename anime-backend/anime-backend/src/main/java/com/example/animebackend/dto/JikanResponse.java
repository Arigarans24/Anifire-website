package com.example.animebackend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true) // Ignore extra fields from Jikan API
public class JikanResponse {
    private List<JikanAnime> data;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class JikanAnime {
        @JsonProperty("mal_id")
        private Long malId;
        private String title;
        private String synopsis;
        private Double score;
        private Integer year;
        private Integer episodes;
        private Images images;
        private List<Genre> genres;
        private List<Genre> themes;
        private List<Genre> demographics;

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Genre {
            @JsonProperty("mal_id")
            private Long malId;
            private String name;
        }

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Images {
            private Jpg jpg;

            @Data
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class Jpg {
                @JsonProperty("image_url")
                private String imageUrl;
            }
        }
    }
}