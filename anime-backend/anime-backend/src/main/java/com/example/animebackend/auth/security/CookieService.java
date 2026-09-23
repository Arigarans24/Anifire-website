package com.example.animebackend.auth.security;

import com.example.animebackend.auth.config.JwtProperties;
import com.example.animebackend.auth.config.SecurityProperties;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

/**
 * Builds the auth cookies.
 *
 * <ul>
 *   <li><b>refresh</b> — httpOnly + Secure + SameSite=Strict, scoped to the auth path.
 *       JS can never read it (XSS-safe); Strict blocks cross-site sends (CSRF-safe).</li>
 *   <li><b>csrf</b> — readable double-submit token paired with the refresh cookie, so
 *       the refresh/logout endpoints can verify the caller can read same-site cookies.</li>
 * </ul>
 */
@Service
public class CookieService {

    public static final String REFRESH_COOKIE = "anifire_rt";
    public static final String CSRF_COOKIE = "anifire_csrf";
    private static final String AUTH_PATH = "/api/v1/auth";

    private final boolean secure;
    private final Duration refreshTtl;

    public CookieService(SecurityProperties security, JwtProperties jwt) {
        this.secure = security.cookieSecure();
        this.refreshTtl = jwt.refreshTtl();
    }

    public ResponseCookie refreshCookie(String value) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(AUTH_PATH)
                .maxAge(refreshTtl)
                .build();
    }

    public ResponseCookie csrfCookie(String value) {
        return ResponseCookie.from(CSRF_COOKIE, value)
                .httpOnly(false) // must be readable by the SPA for the double-submit header
                .secure(secure)
                .sameSite("Strict")
                .path("/")
                .maxAge(refreshTtl)
                .build();
    }

    public ResponseCookie clearRefresh() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true).secure(secure).sameSite("Strict").path(AUTH_PATH).maxAge(0).build();
    }

    public ResponseCookie clearCsrf() {
        return ResponseCookie.from(CSRF_COOKIE, "")
                .httpOnly(false).secure(secure).sameSite("Strict").path("/").maxAge(0).build();
    }
}
