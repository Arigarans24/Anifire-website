package com.example.animebackend.service;

import com.example.animebackend.auth.entity.AppUser;
import com.example.animebackend.auth.entity.Role;
import com.example.animebackend.auth.repository.AppUserRepository;
import com.example.animebackend.auth.web.ApiException;
import com.example.animebackend.dto.CommentRequest;
import com.example.animebackend.dto.CommentResponse;
import com.example.animebackend.entity.Anime;
import com.example.animebackend.entity.Comment;
import com.example.animebackend.repository.AnimeRepository;
import com.example.animebackend.repository.CommentRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final AnimeRepository animeRepository;
    private final AppUserRepository userRepository;

    public CommentService(
            CommentRepository commentRepository,
            AnimeRepository animeRepository,
            AppUserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.animeRepository = animeRepository;
        this.userRepository = userRepository;
    }

    /** Seed a few demo comments on Frieren (incl. an admin message) once. */
    @Transactional
    public void seedDemoComments() {
        if (commentRepository.count() > 0) {
            return;
        }
        Anime frieren = animeRepository
                .findFirstByTitleContainingIgnoreCaseAndIsDeletedFalse("Frieren")
                .orElse(null);
        if (frieren == null) {
            return;
        }
        addDemo(frieren, "Mira", Role.USER,
                "Перевод эмоций без единого слова — это гениально. 10/10 за атмосферу.");
        addDemo(frieren, "Kuro", Role.USER,
                "Первая серия бьёт прямо в сердце. Саундтрек просто космос.");
        addDemo(frieren, "Akari", Role.USER,
                "Медленный темп, но именно он делает историю такой живой. Шедевр сезона.");
        addDemo(frieren, "Anifire Team", Role.ADMIN,
                "Спасибо, что смотрите Frieren у нас! Включили русские и японские "
                        + "субтитры, а ИИ-перевод можно догенерировать на любой язык в плеере.");
    }

    private void addDemo(Anime anime, String name, Role role, String text) {
        commentRepository.save(Comment.builder()
                .anime(anime)
                .description(text)
                .authorName(name)
                .authorRole(role.name())
                .isDeleted(false)
                .build());
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> listForAnime(Long animeId) {
        return commentRepository.findAllByAnimeIdAndIsDeletedFalseOrderByCreationDateDesc(animeId).stream()
                .map(CommentResponse::from)
                .toList();
    }

    @Transactional
    public CommentResponse create(Long animeId, CommentRequest request, Long userId) {
        Anime anime = animeRepository.findByIdAndIsDeletedFalse(animeId)
                .orElseThrow(() -> ApiException.badRequest("anime_not_found", "Anime not found."));
        AppUser author = userRepository.findById(userId).orElse(null);
        String name = author != null && author.getDisplayName() != null
                ? author.getDisplayName()
                : (author != null ? author.getEmail() : "User #" + userId);
        String role = author != null ? author.getRole().name() : Role.USER.name();

        Comment comment = Comment.builder()
                .anime(anime)
                .description(request.description().trim())
                .creatorUserId(userId)
                .authorName(name)
                .authorRole(role)
                .isDeleted(false)
                .build();
        return CommentResponse.from(commentRepository.save(comment));
    }

    @Transactional
    public CommentResponse update(Long id, CommentRequest request, Long userId, Role role) {
        Comment comment = findActive(id);
        requireOwnerOrAdmin(comment, userId, role);
        comment.setDescription(request.description().trim());
        return CommentResponse.from(commentRepository.save(comment));
    }

    @Transactional
    public void softDelete(Long id, Long userId, Role role) {
        Comment comment = findActive(id);
        requireOwnerOrAdmin(comment, userId, role);
        comment.setDeleted(true);
        commentRepository.save(comment);
    }

    private Comment findActive(Long id) {
        return commentRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> ApiException.badRequest("comment_not_found", "Comment not found."));
    }

    private static void requireOwnerOrAdmin(Comment comment, Long userId, Role role) {
        if (role == Role.ADMIN) {
            return;
        }
        if (comment.getCreatorUserId() != null && comment.getCreatorUserId().equals(userId)) {
            return;
        }
        throw ApiException.forbidden("comment_forbidden", "You can edit only your own comments.");
    }
}
