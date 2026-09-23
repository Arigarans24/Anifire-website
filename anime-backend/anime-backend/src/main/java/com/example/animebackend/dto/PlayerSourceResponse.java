package com.example.animebackend.dto;

import java.util.List;

public record PlayerSourceResponse(
        String key,
        String selfHref,
        String title,
        String subtitle,
        String episodeLabel,
        String episodeTitle,
        String src,
        List<QualityResponse> qualities,
        String poster,
        List<SubtitleTrackResponse> tracks,
        List<ChapterResponse> chapters,
        String prevHref,
        String nextHref,
        String backHref,
        String provider) {

    public record SubtitleTrackResponse(
            String id,
            String label,
            String lang,
            List<CueResponse> cues) {
    }

    public record QualityResponse(
            String label,
            int height,
            String src) {
    }

    public record CueResponse(
            double start,
            double end,
            String text) {
    }

    public record ChapterResponse(
            double start,
            double end,
            String kind,
            String label) {
    }
}
