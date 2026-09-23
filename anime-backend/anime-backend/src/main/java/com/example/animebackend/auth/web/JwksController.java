package com.example.animebackend.auth.web;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Publishes the public signing key so any service can validate our JWTs. */
@RestController
public class JwksController {

    private final RSAKey rsaJwk;

    public JwksController(RSAKey rsaJwk) {
        this.rsaJwk = rsaJwk;
    }

    @GetMapping("/.well-known/jwks.json")
    public Map<String, Object> jwks() {
        return new JWKSet(rsaJwk.toPublicJWK()).toJSONObject();
    }
}
