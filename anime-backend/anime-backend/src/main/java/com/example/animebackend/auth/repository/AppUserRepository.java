package com.example.animebackend.auth.repository;

import com.example.animebackend.auth.entity.AppUser;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmailAndIsDeletedFalse(String email);

    boolean existsByEmailAndIsDeletedFalse(String email);

    long countByIsDeletedFalse();

    List<AppUser> findAllByIsDeletedFalseOrderByCreatedAtDesc();
}
