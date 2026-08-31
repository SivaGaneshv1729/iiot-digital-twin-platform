package com.smartfactory.apigateway.controller;

import com.smartfactory.apigateway.dto.AuthResponse;
import com.smartfactory.apigateway.dto.LoginRequest;
import com.smartfactory.apigateway.model.User;
import com.smartfactory.apigateway.repository.UserRepository;
import com.smartfactory.apigateway.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<User> userOpt = userRepository.findByUsername(loginRequest.getUsername());

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Basic password check (In a real app, use PasswordEncoder / BCrypt)
            if (user.getPasswordHash().equals(loginRequest.getPassword())) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
                String token = jwtUtils.generateToken(userDetails);
                return ResponseEntity.ok(new AuthResponse(token, user.getRole()));
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
    }
}
