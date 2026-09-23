package com.example.animebackend.auth.security;

import com.example.animebackend.auth.config.JwtProperties;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

/**
 * Supplies the RSA signing key and the Spring {@link JwtEncoder}/{@link JwtDecoder}.
 *
 * <p>Key resolution order: {@code anifire.jwt.jwk-set} (base64 JWK JSON) → persisted
 * dev key at {@code auth-keys/signing-jwk.json} → freshly generated (and persisted).
 * Asymmetric RS256 means any service can validate with the public key alone.
 */
@Configuration
public class JwtKeyConfig {

    private static final Logger log = LoggerFactory.getLogger(JwtKeyConfig.class);
    private static final Path KEY_FILE = Path.of("auth-keys", "signing-jwk.json");

    private final JwtProperties props;

    public JwtKeyConfig(JwtProperties props) {
        this.props = props;
    }

    @Bean
    public RSAKey rsaJwk() throws Exception {
        String configured = props.jwkSet();
        if (configured != null && !configured.isBlank()) {
            String json = new String(Base64.getDecoder().decode(configured.trim()));
            return RSAKey.parse(json);
        }
        if (Files.exists(KEY_FILE)) {
            return RSAKey.parse(Files.readString(KEY_FILE));
        }
        log.warn("No anifire.jwt.jwk-set configured — generating a DEV RSA key at {}. "
                + "Provide a managed key (env ANIFIRE_JWT_JWK_SET) in production.", KEY_FILE);
        RSAKey key = new RSAKeyGenerator(2048)
                .keyID(UUID.randomUUID().toString())
                .keyUse(KeyUse.SIGNATURE)
                .algorithm(JWSAlgorithm.RS256)
                .generate();
        Files.createDirectories(KEY_FILE.getParent());
        Files.writeString(KEY_FILE, key.toJSONString());
        return key;
    }

    @Bean
    public JWKSource<SecurityContext> jwkSource(RSAKey rsaJwk) {
        return new ImmutableJWKSet<>(new JWKSet(rsaJwk));
    }

    @Bean
    public JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    public JwtDecoder jwtDecoder(RSAKey rsaJwk) throws JOSEException {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(rsaJwk.toRSAPublicKey()).build();
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(props.issuer());
        OAuth2TokenValidator<Jwt> audience = new JwtClaimValidator<List<String>>(
                JwtClaimNames.AUD, aud -> aud != null && aud.contains(props.audience()));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, audience));
        return decoder;
    }
}
