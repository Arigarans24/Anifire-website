package com.example.animebackend.auth.service;

import com.example.animebackend.auth.dto.AdminUserUpdateRequest;
import com.example.animebackend.auth.dto.UserDto;
import com.example.animebackend.auth.entity.AppUser;
import com.example.animebackend.auth.repository.AppUserRepository;
import com.example.animebackend.auth.web.ApiException;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserAdminService {

    private final AppUserRepository userRepository;

    public UserAdminService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<UserDto> list() {
        return userRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
                .map(UserDto::from)
                .toList();
    }

    @Transactional
    public UserDto update(Long id, AdminUserUpdateRequest request) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> ApiException.badRequest("user_not_found", "User not found."));

        if (request.displayName() != null) {
            user.setDisplayName(request.displayName().trim());
        }
        if (request.email() != null && !request.email().isBlank()) {
            user.setEmail(request.email().trim().toLowerCase(Locale.ROOT));
        }
        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (request.emailVerified() != null) {
            user.setEmailVerified(request.emailVerified());
        }
        if (request.deleted() != null) {
            user.setDeleted(request.deleted());
        }
        return UserDto.from(userRepository.save(user));
    }
}
