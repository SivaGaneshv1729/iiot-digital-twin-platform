package com.smartfactory.apigateway.controller;

import com.smartfactory.apigateway.model.Machine;
import com.smartfactory.apigateway.repository.MachineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.List;

@RestController
@RequestMapping("/api/machines")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MachineController {

    private final MachineRepository machineRepository;

    @GetMapping
    public ResponseEntity<List<Machine>> getAllMachines() {
        return ResponseEntity.ok(machineRepository.findAll());
    }
}
