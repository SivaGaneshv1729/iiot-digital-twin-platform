package com.smartfactory.apigateway.controller;

import com.smartfactory.apigateway.model.Machine;
import com.smartfactory.apigateway.repository.MachineRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/machines")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MachineController {

    private final MachineRepository machineRepository;
    private final com.smartfactory.apigateway.service.TelemetrySimulator telemetrySimulator;

    @GetMapping
    public ResponseEntity<List<Machine>> getAllMachines() {
        return ResponseEntity.ok(machineRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Machine> getMachineById(@PathVariable Long id) {
        return machineRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Update status only
    @PostMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Optional<Machine> opt = machineRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Machine m = opt.get();
        m.setStatus(body.get("status"));
        machineRepository.save(m);
        return ResponseEntity.ok(m);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SIMULATOR ENDPOINT — full override of status, temperature, running_hours
    // ──────────────────────────────────────────────────────────────────────────
    @Data
    static class SimulatorPayload {
        private String status;
        private Double temperature;
        private Double vibration;
        private Double pressure;
        private Integer runningHours;
    }

    @PostMapping("/{id}/simulate")
    public ResponseEntity<?> simulateMachine(@PathVariable Long id, @RequestBody SimulatorPayload payload) {
        Optional<Machine> opt = machineRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Machine m = opt.get();
        if (payload.getStatus() != null)       m.setStatus(payload.getStatus());
        if (payload.getTemperature() != null)  m.setTemperature(BigDecimal.valueOf(payload.getTemperature()));
        if (payload.getVibration() != null)    m.setVibration(BigDecimal.valueOf(payload.getVibration()));
        if (payload.getPressure() != null)     m.setPressure(BigDecimal.valueOf(payload.getPressure()));
        if (payload.getRunningHours() != null) m.setRunningHours(payload.getRunningHours());
        machineRepository.save(m);
        telemetrySimulator.broadcast(machineRepository.findAll());
        return ResponseEntity.ok(m);
    }

    // BULK SIMULATOR — update multiple machines in one call (used by scenario buttons)
    @Data
    static class BulkSimulatorPayload {
        private List<Long> ids;
        private String status;
        private Double temperature;
        private Double vibration;
        private Double pressure;
        private Integer runningHours;
    }

    @PostMapping("/simulate/bulk")
    public ResponseEntity<?> bulkSimulate(@RequestBody BulkSimulatorPayload payload) {
        if (payload.getIds() == null || payload.getIds().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "ids required"));
        }
        List<Machine> machines = machineRepository.findAllById(payload.getIds());
        for (Machine m : machines) {
            if (payload.getStatus() != null)       m.setStatus(payload.getStatus());
            if (payload.getTemperature() != null)  m.setTemperature(BigDecimal.valueOf(payload.getTemperature()));
            if (payload.getVibration() != null)    m.setVibration(BigDecimal.valueOf(payload.getVibration()));
            if (payload.getPressure() != null)     m.setPressure(BigDecimal.valueOf(payload.getPressure()));
            if (payload.getRunningHours() != null) m.setRunningHours(payload.getRunningHours());
        }
        machineRepository.saveAll(machines);
        telemetrySimulator.broadcast(machineRepository.findAll());
        return ResponseEntity.ok(Map.of("updated", machines.size()));
    }

    // SCENARIO ENDPOINT — named presets applied server-side
    @PostMapping("/simulate/scenario")
    public ResponseEntity<?> applyScenario(@RequestBody Map<String, String> body) {
        String scenario = body.getOrDefault("scenario", "");
        List<Machine> all = machineRepository.findAll();

        switch (scenario) {
            case "all_normal" -> {
                for (Machine m : all) {
                    m.setStatus("Running");
                    double temp = 55 + Math.random() * 15; // 55–70°C
                    m.setTemperature(BigDecimal.valueOf(Math.round(temp * 10.0) / 10.0));
                }
            }
            case "thermal_crisis" -> {
                // First 5 machines go critical
                List<Machine> targets = all.subList(0, Math.min(5, all.size()));
                for (Machine m : targets) {
                    m.setStatus("Running");
                    double temp = 100 + Math.random() * 15; // 100–115°C
                    m.setTemperature(BigDecimal.valueOf(Math.round(temp * 10.0) / 10.0));
                }
            }
            case "planned_maintenance" -> {
                for (Machine m : all) {
                    if (m.getName() != null && m.getName().contains("Block E")) {
                        m.setStatus("Maintenance");
                    }
                }
            }
            case "cascade_failure" -> {
                int idleCount = 0, maintCount = 0;
                for (Machine m : all) {
                    if (idleCount < 12) { m.setStatus("Idle"); idleCount++; }
                    else if (maintCount < 3) { m.setStatus("Maintenance"); maintCount++; }
                    else break;
                }
            }
            default -> {
                return ResponseEntity.badRequest().body(Map.of("error", "Unknown scenario: " + scenario));
            }
        }

        machineRepository.saveAll(all);
        telemetrySimulator.broadcast(all);
        return ResponseEntity.ok(Map.of("scenario", scenario, "machinesAffected", all.size()));
    }

    @PostMapping("/emergency-stop")
    public ResponseEntity<?> emergencyStop() {
        List<Machine> all = machineRepository.findAll();
        for (Machine m : all) {
            m.setStatus("Maintenance");
        }
        machineRepository.saveAll(all);
        telemetrySimulator.broadcast(all);
        return ResponseEntity.ok(Map.of("message", "EMERGENCY_STOP_ACTIVATED"));
    }

    @PostMapping("/emergency-revoke")
    public ResponseEntity<?> emergencyRevoke() {
        List<Machine> all = machineRepository.findAll();
        for (Machine m : all) {
            m.setStatus("Running");
        }
        machineRepository.saveAll(all);
        telemetrySimulator.broadcast(all);
        return ResponseEntity.ok(Map.of("message", "EMERGENCY_STOP_REVOKED"));
    }
}
