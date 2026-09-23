package com.example.animebackend.dto;

import com.example.animebackend.entity.Comment;
import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long animeId,
        String description,
        LocalDateTime creationDate,
        boolean deleted,
        Long creatorUserId,
        String authorName,
        String authorRole) {

    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getAnime().getId(),
                comment.getDescription(),
                comment.getCreationDate(),
                comment.isDeleted(),
                comment.getCreatorUserId(),
                comment.getAuthorName(),
                comment.getAuthorRole());
    }
}
