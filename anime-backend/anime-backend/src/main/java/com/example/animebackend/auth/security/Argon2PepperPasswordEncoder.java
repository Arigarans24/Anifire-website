package com.example.animebackend.auth.security;

import com.example.animebackend.auth.config.SecurityProperties;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Argon2id with a server-side <em>pepper</em>.
 *
 * <p>Flow: {@code Argon2id( HMAC-SHA256(pepper, password) )}. The pepper is a secret
 * held outside the database (env/secret manager), so a DB-only breach yields hashes
 * an attacker can't brute-force without also stealing the pepper. Argon2id supplies
 * the per-password random salt and the memory-hard work factor (OWASP 2024: m=19MiB,
 * t=2, p=1).
 */
@Component
public class Argon2PepperPasswordEncoder implements PasswordEncoder {

    private static final Base64.Encoder B64 = Base64.getEncoder();

    private final Argon2PasswordEncoder argon2 =
            new Argon2PasswordEncoder(16, 32, 1, 19_456, 2);
    private final byte[] pepper;

    public Argon2PepperPasswordEncoder(SecurityProperties props) {
        this.pepper = Base64.getDecoder().decode(props.pepper());
    }

    @Override
    public String encode(CharSequence rawPassword) {
        return argon2.encode(pepper(rawPassword));
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null || encodedPassword.isEmpty()) {
            return false;
        }
        return argon2.matches(pepper(rawPassword), encodedPassword);
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        return argon2.upgradeEncoding(encodedPassword);
    }

    private String pepper(CharSequence raw) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper, "HmacSHA256"));
            byte[] out = mac.doFinal(raw.toString().getBytes(StandardCharsets.UTF_8));
            return B64.encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to pepper password", e);
        }
    }
}
