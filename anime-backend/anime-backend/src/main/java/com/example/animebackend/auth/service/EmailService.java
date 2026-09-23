package com.example.animebackend.auth.service;

import com.example.animebackend.auth.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Dev email transport: logs the action links instead of sending mail.
 * Swap the log calls for a {@code JavaMailSender}/provider SDK in production —
 * the call sites and link format stay the same.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final String frontendUrl;

    public EmailService(AppProperties props) {
        this.frontendUrl = props.frontendUrl();
    }

    public void sendVerification(String email, String rawToken) {
        String link = frontendUrl + "/verify-email?token=" + rawToken;
        log.info("[email→{}] Verify your account: {}", email, link);
    }

    public void sendPasswordReset(String email, String rawToken) {
        String link = frontendUrl + "/reset-password?token=" + rawToken;
        log.info("[email→{}] Reset your password (valid 30 min): {}", email, link);
    }

    public void sendAccountExistsNotice(String email) {
        log.info("[email→{}] A registration was attempted for an existing account. "
                + "If this was you, sign in or reset your password.", email);
    }
}
