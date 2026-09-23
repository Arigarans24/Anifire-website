package com.example.animebackend.repository;

import com.example.animebackend.entity.Comment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findAllByAnimeIdAndIsDeletedFalseOrderByCreationDateDesc(Long animeId);

    Optional<Comment> findByIdAndIsDeletedFalse(Long id);

    long countByIsDeletedFalse();
}
