package com.smartfactory.apigateway.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

/**
 * Proxies AI/ML model endpoints from the Python ML Engine (FastAPI)
 * to the Spring Boot API gateway so the frontend can access them
 * through a single origin.
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AIController {

    @Value("${ML_ENGINE_URL:http://ml-engine:8000}")
    private String mlEngineUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * GET /api/ai/model/metrics
     * Proxies to ML Engine's /model/metrics endpoint.
     * Returns genuine evaluation metrics (Accuracy, Precision, Recall, F1, AUC, etc.)
     */
    @GetMapping("/model/metrics")
    public ResponseEntity<?> getModelMetrics() {
        try {
            String response = restTemplate.getForObject(mlEngineUrl + "/model/metrics", String.class);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(response);
        } catch (Exception e) {
            return ResponseEntity.status(503).body("{\"error\": \"ML Engine unavailable: " + e.getMessage() + "\"}");
        }
    }

    /**
     * POST /api/ai/predict/maintenance
     * Proxies maintenance prediction requests (used by Machines page).
     */
    @PostMapping("/predict/maintenance")
    public ResponseEntity<?> predictMaintenance(@RequestBody Object body) {
        try {
            String response = restTemplate.postForObject(mlEngineUrl + "/predict/batch", body, String.class);
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(response);
        } catch (Exception e) {
            return ResponseEntity.status(503).body("{\"error\": \"ML Engine unavailable\"}");
        }
    }
}
