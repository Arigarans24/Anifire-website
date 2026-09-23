package com.example.animebackend.auth.repository;

import com.example.animebackend.auth.entity.TokenType;
import com.example.animebackend.auth.entity.VerificationToken;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {

    Optional<VerificationToken> findByTokenHash(String tokenHash);

    /** Invalidate any still-pending tokens of a type for a user before issuing a new one. */
    @Modifying
    @Query("update VerificationToken v set v.usedAt = :now "
            + "where v.userId = :userId and v.type = :type and v.usedAt is null")
    void consumePending(@Param("userId") Long userId, @Param("type") TokenType type, @Param("now") Instant now);

    @Modifying
    @Query("delete from VerificationToken v where v.expiresAt < :cutoff")
    int deleteExpired(@Param("cutoff") Instant cutoff);
}
