package com.example.animebackend.repository;

import com.example.animebackend.entity.Anime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AnimeRepository extends JpaRepository<Anime, Long>, JpaSpecificationExecutor<Anime> {
    // automatically generates: SELECT * FROM animes WHERE is_deleted = false
    List<Anime> findAllByIsDeletedFalse();

    Optional<Anime> findByIdAndIsDeletedFalse(Long id);

    Optional<Anime> findFirstByTitleContainingIgnoreCaseAndIsDeletedFalse(String title);
}
