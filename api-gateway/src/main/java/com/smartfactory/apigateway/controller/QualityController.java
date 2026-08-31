package com.smartfactory.apigateway.controller;

import com.smartfactory.apigateway.model.QualityInspection;
import com.smartfactory.apigateway.repository.QualityInspectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quality")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class QualityController {

    private final QualityInspectionRepository qualityInspectionRepository;

    @GetMapping
    public ResponseEntity<List<QualityInspection>> getQualityData() {
        return ResponseEntity.ok(qualityInspectionRepository.findAllByOrderByInspectionTimeDesc());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getQualityStats() {
        long passed = qualityInspectionRepository.countByStatus("Pass");
        long failed = qualityInspectionRepository.countByStatus("Fail");
        long total = passed + failed;
        double defectRate = total > 0 ? ((double) failed / total) * 100 : 0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("total_inspections", total);
        stats.put("passed", passed);
        stats.put("failed", failed);
        stats.put("defect_rate", String.format("%.1f", defectRate));

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/defect-types")
    public ResponseEntity<List<Map<String, Object>>> getDefectTypes() {
        List<Map<String, Object>> defects = qualityInspectionRepository.countDefectTypes();
        if (defects.isEmpty()) {
            // Mock fallback
            defects.add(Map.of("name", "Micro-fracture", "count", 45));
            defects.add(Map.of("name", "Alignment", "count", 30));
        }
        return ResponseEntity.ok(defects);
    }
}
