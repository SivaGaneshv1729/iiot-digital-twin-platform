package com.smartfactory.apigateway.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartfactory.apigateway.config.RedisConfig;
import com.smartfactory.apigateway.model.Machine;
import com.smartfactory.apigateway.repository.MachineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Random;

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
                // Fluctuate temperature
                double tempFluctuation = (random.nextDouble() - 0.5) * 2;
                double newTemp = Math.max(20, Math.min(100, m.getTemperature().doubleValue() + tempFluctuation));
                m.setTemperature(BigDecimal.valueOf(newTemp));

                // Change status randomly
                if (!"Maintenance".equals(m.getStatus()) && random.nextDouble() < 0.05) {
                    m.setStatus(random.nextDouble() < 0.8 ? "Running" : "Idle");
                }

                // Increment running hours
                if ("Running".equals(m.getStatus())) {
                    m.setRunningHours(m.getRunningHours() + 1);
                }
            }
            
            // Save to DB
            machineRepository.saveAll(machines);

            // Publish to Redis
            String jsonPayload = objectMapper.writeValueAsString(machines);
            redisTemplate.convertAndSend(RedisConfig.TELEMETRY_CHANNEL, jsonPayload);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
