package com.example.animebackend.service;

import com.example.animebackend.auth.web.ApiException;
import com.example.animebackend.dto.CategoryRequest;
import com.example.animebackend.dto.CategoryResponse;
import com.example.animebackend.entity.Category;
import com.example.animebackend.repository.CategoryRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

    private final CategoryRepository repository;

    public CategoryService(CategoryRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        return repository.findAllByIsDeletedFalseOrderByNameAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = normalize(request.name());
        repository.findByNameIgnoreCaseAndIsDeletedFalse(name).ifPresent(existing -> {
            throw ApiException.badRequest("category_exists", "Category already exists.");
        });
        return CategoryResponse.from(repository.save(Category.builder().name(name).build()));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = findActive(id);
        category.setName(normalize(request.name()));
        return CategoryResponse.from(repository.save(category));
    }

    @Transactional
    public void softDelete(Long id) {
        Category category = findActive(id);
        category.setDeleted(true);
        repository.save(category);
    }

    private Category findActive(Long id) {
        return repository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> ApiException.badRequest("category_not_found", "Category not found."));
    }

    private static String normalize(String name) {
        return name.trim();
    }
}
