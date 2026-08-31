package com.smartfactory.apigateway.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.sql.Timestamp;

@Entity
@Table(name = "telemetry_history")
@Data
@NoArgsConstructor
public class TelemetryHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @Column(precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(length = 20)
    private String status;

    @Column(insertable = false, updatable = false)
    private Timestamp timestamp;
}
