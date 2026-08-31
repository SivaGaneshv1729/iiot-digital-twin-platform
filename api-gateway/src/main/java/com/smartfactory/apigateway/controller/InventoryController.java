package com.smartfactory.apigateway.controller;

import com.smartfactory.apigateway.model.Inventory;
import com.smartfactory.apigateway.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryRepository inventoryRepository;

    @GetMapping
    public ResponseEntity<List<Inventory>> getInventory() {
        return ResponseEntity.ok(inventoryRepository.findAllByOrderByCategoryAscItemNameAsc());
    }
}
