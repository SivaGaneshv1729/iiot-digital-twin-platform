package com.smartfactory.apigateway.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartfactory.apigateway.config.RedisConfig;
import com.smartfactory.apigateway.model.Machine;
import com.smartfactory.apigateway.repository.MachineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetrySimulator {

    private final MachineRepository machineRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Random random = new Random();

    @Scheduled(fixedRate = 2000)
    @Transactional
    public void simulateTelemetry() {
        try {
            List<Machine> machines = machineRepository.findAll();
            if (machines.isEmpty()) return;

            for (Machine m : machines) {
                if ("Running".equals(m.getStatus())) {
                    // Realistic gentle flutter (±0.4°C) around existing temperature
                    double fluctuation = (random.nextDouble() - 0.5) * 0.8;
                    double currentTemp = m.getTemperature() != null ? m.getTemperature().doubleValue() : 60.0;
                    double newTemp = Math.max(20.0, Math.min(135.0, currentTemp + fluctuation));
                    m.setTemperature(BigDecimal.valueOf(newTemp).setScale(2, RoundingMode.HALF_UP));

                    // Increment running hours occasionally
                    if (random.nextDouble() < 0.2) {
                        m.setRunningHours((m.getRunningHours() != null ? m.getRunningHours() : 0) + 1);
                    }
                } else if ("Idle".equals(m.getStatus())) {
                    // Idle machines slowly cool down towards 30°C
                    double currentTemp = m.getTemperature() != null ? m.getTemperature().doubleValue() : 35.0;
                    if (currentTemp > 32.0) {
                        m.setTemperature(BigDecimal.valueOf(currentTemp - 0.3).setScale(2, RoundingMode.HALF_UP));
                    }
                }
            }

            machineRepository.saveAll(machines);
            broadcast(machines);

        } catch (Exception e) {
            log.error("Telemetry simulation error: {}", e.getMessage());
        }
    }

    public void broadcast(List<Machine> machines) {
        try {
            String jsonPayload = objectMapper.writeValueAsString(machines);
            redisTemplate.convertAndSend(RedisConfig.TELEMETRY_CHANNEL, jsonPayload);
        } catch (Exception e) {
            log.error("Failed to broadcast telemetry to Redis: {}", e.getMessage());
        }
    }
}
