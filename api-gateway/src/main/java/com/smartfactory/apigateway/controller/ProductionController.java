package com.smartfactory.apigateway.controller;

import com.smartfactory.apigateway.model.ProductionOrder;
import com.smartfactory.apigateway.repository.ProductionOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/production")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ProductionController {

    private final ProductionOrderRepository productionOrderRepository;

    @GetMapping
    public ResponseEntity<List<ProductionOrder>> getProductionOrders() {
        return ResponseEntity.ok(productionOrderRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/summary")
    public ResponseEntity<java.util.Map<String, Object>> getProductionSummary() {
        return ResponseEntity.ok(java.util.Map.of(
            "active_machines", 185,
            "total_target", 20000,
            "total_completed", 18634,
            "efficiency", 0.942
        ));
    }
}
