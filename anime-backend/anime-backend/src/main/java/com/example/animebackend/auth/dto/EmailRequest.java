package com.example.animebackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Body carrying just an email (resend verification). */
public record EmailRequest(@NotBlank @Email String email) {
}
