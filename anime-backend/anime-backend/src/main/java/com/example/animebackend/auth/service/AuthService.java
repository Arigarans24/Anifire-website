package com.example.animebackend.auth.service;

import com.example.animebackend.auth.config.SecurityProperties;
import com.example.animebackend.auth.dto.AuthResponse;
import com.example.animebackend.auth.dto.LoginRequest;
import com.example.animebackend.auth.dto.RegisterRequest;
import com.example.animebackend.auth.dto.ResetPasswordRequest;
import com.example.animebackend.auth.dto.SocialLoginRequest;
import com.example.animebackend.auth.dto.UserDto;
import com.example.animebackend.auth.entity.AppUser;
import com.example.animebackend.auth.entity.Role;
import com.example.animebackend.auth.entity.TokenType;
import com.example.animebackend.auth.repository.AppUserRepository;
import com.example.animebackend.auth.security.Argon2PepperPasswordEncoder;
import com.example.animebackend.auth.security.JwtService;
import com.example.animebackend.auth.security.RateLimiterService;
import com.example.animebackend.auth.security.Tokens;
import com.example.animebackend.auth.web.ApiException;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /** Carries the issued tokens back to the controller, which sets the refresh cookie. */
    public record AuthResult(JwtService.AccessToken accessToken, String refreshToken, UserDto user) {
        public AuthResponse toResponse() {
            return new AuthResponse(accessToken.value(), "Bearer", accessToken.expiresInSeconds(), user);
        }
    }

    private final AppUserRepository userRepo;
    private final Argon2PepperPasswordEncoder encoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokens;
    private final VerificationTokenService verificationTokens;
    private final EmailService emailService;
    private final PwnedPasswordService pwned;
    private final RateLimiterService rateLimiter;
    private final SecurityProperties security;

    /** Pre-computed hash so login timing is identical whether or not the user exists. */
    private final String dummyHash;

    public AuthService(
            AppUserRepository userRepo,
            Argon2PepperPasswordEncoder encoder,
            JwtService jwtService,
            RefreshTokenService refreshTokens,
            VerificationTokenService verificationTokens,
            EmailService emailService,
            PwnedPasswordService pwned,
            RateLimiterService rateLimiter,
            SecurityProperties security) {
        this.userRepo = userRepo;
        this.encoder = encoder;
        this.jwtService = jwtService;
        this.refreshTokens = refreshTokens;
        this.verificationTokens = verificationTokens;
        this.emailService = emailService;
        this.pwned = pwned;
        this.rateLimiter = rateLimiter;
        this.security = security;
        this.dummyHash = encoder.encode("timing-equalizer-not-a-real-password");
    }

    // ───────────────────────── Registration ─────────────────────────

    @Transactional
    public void register(RegisterRequest req, String ip) {
        if (!rateLimiter.allow("register:ip:" + ip, 5, Duration.ofHours(1))) {
            throw ApiException.tooManyRequests("Too many sign-up attempts. Try again later.");
        }
        if (security.breachCheckEnabled() && pwned.isBreached(req.password())) {
            throw ApiException.badRequest("weak_password",
                    "This password has appeared in a known data breach. Please choose another.");
        }
        String email = normalize(req.email());

        // Non-enumerating: respond identically whether or not the account exists.
        if (userRepo.existsByEmailAndIsDeletedFalse(email)) {
            emailService.sendAccountExistsNotice(email);
            return;
        }

        boolean autoVerify = security.autoVerifyEmail();
        AppUser user = AppUser.builder()
                .email(email)
                .passwordHash(encoder.encode(req.password()))
                .displayName(displayName(req.displayName(), email))
                .role(userRepo.countByIsDeletedFalse() == 0 ? Role.ADMIN : Role.USER)
                .emailVerified(autoVerify)
                .build();
        userRepo.save(user);

        // In dev (auto-verify) we skip the email round-trip entirely; otherwise
        // issue a verification token and "send" it (logged by EmailService).
        if (!autoVerify) {
            String token = verificationTokens.issue(user.getId(), TokenType.EMAIL_VERIFY);
            emailService.sendVerification(email, token);
        }
        log.info("Registered new user id={} (autoVerify={})", user.getId(), autoVerify);
    }

    // ───────────────────────── Login ─────────────────────────

    @Transactional
    public AuthResult login(LoginRequest req, String ip, String userAgent) {
        if (!rateLimiter.allow("login:ip:" + ip, 60, Duration.ofMinutes(1))) {
            throw ApiException.tooManyRequests("Too many attempts. Try again shortly.");
        }
        String email = normalize(req.email());
        if (!rateLimiter.allow("login:acct:" + email, 20, Duration.ofMinutes(5))) {
            throw ApiException.tooManyRequests("Too many attempts. Try again shortly.");
        }

        AppUser user = userRepo.findByEmailAndIsDeletedFalse(email).orElse(null);

        if (user != null && user.getLockedUntil() != null
                && user.getLockedUntil().isAfter(Instant.now())) {
            throw ApiException.locked("Account temporarily locked. Try again later.");
        }

        // Always run a hash comparison to equalize timing (anti-enumeration).
        boolean ok = (user != null)
                ? encoder.matches(req.password(), user.getPasswordHash())
                : runDummy(req.password());

        if (!ok) {
            if (user != null) {
                registerFailure(user);
            }
            throw ApiException.unauthorized("invalid_credentials", "Invalid email or password.");
        }
        if (user == null) {
            throw ApiException.unauthorized("invalid_credentials", "Invalid email or password.");
        }

        // Require a verified email unless dev auto-verify is on. The verification
        // link is printed in the backend terminal by EmailService.
        if (!security.autoVerifyEmail() && !user.isEmailVerified()) {
            throw ApiException.forbidden(
                    "email_not_verified",
                    "Please confirm your email first — the verification link is in the server log.");
        }

        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        userRepo.save(user);

        return issueTokens(user, ip, userAgent);
    }

    @Transactional
    public AuthResult socialLogin(SocialLoginRequest req, String ip, String userAgent) {
        String provider = normalizeProvider(req.provider());
        String email = provider + ".demo@anifire.local";
        AppUser user = userRepo.findByEmailAndIsDeletedFalse(email).orElseGet(() -> {
            AppUser created = AppUser.builder()
                    .email(email)
                    .passwordHash(encoder.encode("social-login-" + provider + "-" + Tokens.random()))
                    .displayName(providerLabel(provider) + " User")
                    .role(userRepo.countByIsDeletedFalse() == 0 ? Role.ADMIN : Role.USER)
                    .emailVerified(true)
                    .build();
            return userRepo.save(created);
        });
        user.setLastLoginAt(Instant.now());
        userRepo.save(user);
        return issueTokens(user, ip, userAgent);
    }

    private void registerFailure(AppUser user) {
        int attempts = user.getFailedAttempts() + 1;
        user.setFailedAttempts(attempts);
        if (attempts >= security.maxFailedAttempts()) {
            user.setLockedUntil(Instant.now().plus(security.lockDuration()));
            user.setFailedAttempts(0);
            log.warn("Account locked after {} failed logins: id={}", attempts, user.getId());
        }
        userRepo.save(user);
    }

    private boolean runDummy(String password) {
        encoder.matches(password, dummyHash);
        return false;
    }

    // ───────────────────────── Refresh / Logout ─────────────────────────

    @Transactional
    public AuthResult refresh(String rawRefresh, String ip, String userAgent) {
        RefreshTokenService.Rotation rot = refreshTokens.rotate(rawRefresh, ip, userAgent);
        AppUser user = userRepo.findById(rot.userId())
                .filter(u -> !u.isDeleted())
                .orElseThrow(() -> ApiException.unauthorized("invalid_refresh",
                        "Session expired. Please sign in again."));
        JwtService.AccessToken access = jwtService.issue(user);
        return new AuthResult(access, rot.newRawToken(), UserDto.from(user));
    }

    public void logout(String rawRefresh) {
        if (rawRefresh != null) {
            refreshTokens.revoke(rawRefresh);
        }
    }

    // ───────────────────────── Email verify / resend ─────────────────────────

    @Transactional
    public void verifyEmail(String token) {
        Long userId = verificationTokens.consume(token, TokenType.EMAIL_VERIFY);
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> ApiException.badRequest("invalid_token", "This link is invalid or has expired."));
        user.setEmailVerified(true);
        userRepo.save(user);
    }

    @Transactional
    public void resendVerification(String email, String ip) {
        if (!rateLimiter.allow("resend:ip:" + ip, 5, Duration.ofHours(1))) {
            throw ApiException.tooManyRequests("Too many requests. Try again later.");
        }
        userRepo.findByEmailAndIsDeletedFalse(normalize(email)).ifPresent(u -> {
            if (!u.isEmailVerified()) {
                String token = verificationTokens.issue(u.getId(), TokenType.EMAIL_VERIFY);
                emailService.sendVerification(u.getEmail(), token);
            }
        });
    }

    // ───────────────────────── Password reset ─────────────────────────

    @Transactional
    public void forgotPassword(String email, String ip) {
        if (!rateLimiter.allow("forgot:ip:" + ip, 5, Duration.ofHours(1))) {
            throw ApiException.tooManyRequests("Too many requests. Try again later.");
        }
        userRepo.findByEmailAndIsDeletedFalse(normalize(email)).ifPresent(u -> {
            String token = verificationTokens.issue(u.getId(), TokenType.PASSWORD_RESET);
            emailService.sendPasswordReset(u.getEmail(), token);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        if (security.breachCheckEnabled() && pwned.isBreached(req.password())) {
            throw ApiException.badRequest("weak_password",
                    "This password has appeared in a known data breach. Please choose another.");
        }
        Long userId = verificationTokens.consume(req.token(), TokenType.PASSWORD_RESET);
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> ApiException.badRequest("invalid_token", "This link is invalid or has expired."));
        user.setPasswordHash(encoder.encode(req.password()));
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepo.save(user);
        // Reset invalidates every active session.
        refreshTokens.revokeAllForUser(userId);
        log.info("Password reset for user id={}; all sessions revoked", userId);
    }

    // ───────────────────────── Current user ─────────────────────────

    public UserDto getUser(Long id) {
        return userRepo.findById(id)
                .filter(u -> !u.isDeleted())
                .map(UserDto::from)
                .orElseThrow(() -> ApiException.unauthorized("unauthorized", "Not authenticated."));
    }

    // ───────────────────────── Helpers ─────────────────────────

    private AuthResult issueTokens(AppUser user, String ip, String userAgent) {
        JwtService.AccessToken access = jwtService.issue(user);
        String refresh = refreshTokens.startSession(user.getId(), ip, userAgent);
        return new AuthResult(access, refresh, UserDto.from(user));
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeProvider(String provider) {
        String value = provider == null ? "" : provider.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "google", "microsoft", "apple" -> value;
            default -> throw ApiException.badRequest("unsupported_provider", "Unsupported social provider.");
        };
    }

    private static String providerLabel(String provider) {
        return switch (provider) {
            case "google" -> "Google";
            case "microsoft" -> "Microsoft";
            case "apple" -> "Apple";
            default -> "Social";
        };
    }

    private static String displayName(String provided, String email) {
        if (provided != null && !provided.isBlank()) {
            return provided.trim();
        }
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }
}
