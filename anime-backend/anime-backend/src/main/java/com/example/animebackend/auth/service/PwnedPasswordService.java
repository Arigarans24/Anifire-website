package com.example.animebackend.auth.service;

import com.example.animebackend.auth.config.SecurityProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Checks a candidate password against Have-I-Been-Pwned using the k-anonymity range
 * API: only the first 5 chars of the SHA-1 are sent, so the password never leaves
 * this server. Fails <em>open</em> (network issue → not blocked) so HIBP downtime
 * can't break sign-up.
 */
@Service
public class PwnedPasswordService {

    private static final Logger log = LoggerFactory.getLogger(PwnedPasswordService.class);
    private static final String RANGE_URL = "https://api.pwnedpasswords.com/range/";

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();
    private final boolean enabled;

    public PwnedPasswordService(SecurityProperties props) {
        this.enabled = props.breachCheckEnabled();
    }

    public boolean isBreached(String password) {
        if (!enabled) {
            return false;
        }
        try {
            String sha1 = sha1UpperHex(password);
            String prefix = sha1.substring(0, 5);
            String suffix = sha1.substring(5);

            HttpRequest request = HttpRequest.newBuilder(URI.create(RANGE_URL + prefix))
                    .header("Add-Padding", "true")
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return false;
            }
            for (String line : response.body().split("\\r?\\n")) {
                int colon = line.indexOf(':');
                if (colon < 0) {
                    continue;
                }
                String candidate = line.substring(0, colon).trim();
                long count = parseCount(line.substring(colon + 1));
                if (count > 0 && candidate.equalsIgnoreCase(suffix)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            log.warn("HIBP breach check failed (failing open): {}", e.getMessage());
            return false;
        }
    }

    private static long parseCount(String s) {
        try {
            return Long.parseLong(s.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static String sha1UpperHex(String value) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(digest.length * 2);
        for (byte b : digest) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString().toUpperCase();
    }
}
