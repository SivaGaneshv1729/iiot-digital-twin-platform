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
}
