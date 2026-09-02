package com.smartfactory.apigateway.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.sql.Timestamp;

@Entity
@Table(name = "machines")
@Data
@NoArgsConstructor
public class Machine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(precision = 5, scale = 2)
    private BigDecimal vibration;

    @Column(precision = 5, scale = 2)
    private BigDecimal pressure;

    @Column(name = "running_hours")
    private Integer runningHours = 0;

    @Column(name = "last_maintenance")
    private Timestamp lastMaintenance;

    @Transient
    private Double anomalyScore;
}
