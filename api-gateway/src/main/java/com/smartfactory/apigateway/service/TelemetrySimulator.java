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

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetrySimulator {

    private final MachineRepository machineRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Random random = new Random();

    @Value("${ML_ENGINE_URL:http://ml-engine:8000}")
    private String mlEngineUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public static class MachineState {
        public Long id;
        public String status;
        public double temperature;
        public double vibration;
        public double pressure;
        public int running_hours;
    }

    public static class PredictionResult {
        public Long id;
        public double predicted_temperature;
        public double predicted_vibration;
        public double predicted_pressure;
        public double anomaly_score;
        public int running_hours;
    }

    @Scheduled(fixedRate = 2000)
    @Transactional
    public void simulateTelemetry() {
        try {
            List<Machine> machines = machineRepository.findAll();
            if (machines.isEmpty()) return;

            // Prepare payload for ML Engine
            List<MachineState> payload = machines.stream().map(m -> {
                MachineState state = new MachineState();
                state.id = m.getId();
                state.status = m.getStatus();
                state.temperature = m.getTemperature() != null ? m.getTemperature().doubleValue() : 60.0;
                state.vibration = m.getVibration() != null ? m.getVibration().doubleValue() : 2.5;
                state.pressure = m.getPressure() != null ? m.getPressure().doubleValue() : 50.0;
                state.running_hours = m.getRunningHours() != null ? m.getRunningHours() : 0;
                return state;
            }).toList();

            // Call ML Engine
            PredictionResult[] results = restTemplate.postForObject(
                    mlEngineUrl + "/predict/batch",
                    payload,
                    PredictionResult[].class
            );

            if (results != null) {
                for (PredictionResult result : results) {
                    machines.stream()
                            .filter(m -> m.getId().equals(result.id))
                            .findFirst()
                            .ifPresent(m -> {
                                m.setTemperature(BigDecimal.valueOf(result.predicted_temperature).setScale(2, RoundingMode.HALF_UP));
                                m.setVibration(BigDecimal.valueOf(result.predicted_vibration).setScale(2, RoundingMode.HALF_UP));
                                m.setPressure(BigDecimal.valueOf(result.predicted_pressure).setScale(2, RoundingMode.HALF_UP));
                                m.setRunningHours(result.running_hours);
                                m.setAnomalyScore(result.anomaly_score);
                            });
                }
            }

            machineRepository.saveAll(machines);
            broadcast(machines);

        } catch (Exception e) {
            log.error("ML Telemetry simulation error (falling back to standby): {}", e.getMessage());
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
