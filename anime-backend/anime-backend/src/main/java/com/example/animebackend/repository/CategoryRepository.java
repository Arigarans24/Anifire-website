package com.example.animebackend.repository;

import com.example.animebackend.entity.Category;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByIsDeletedFalseOrderByNameAsc();

    Optional<Category> findByIdAndIsDeletedFalse(Long id);

    Optional<Category> findByNameIgnoreCaseAndIsDeletedFalse(String name);
}
