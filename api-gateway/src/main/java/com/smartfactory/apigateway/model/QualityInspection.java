package com.smartfactory.apigateway.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.sql.Timestamp;

@Entity
@Table(name = "quality_inspections")
@Data
@NoArgsConstructor
public class QualityInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_number", nullable = false, length = 50)
    private String batchNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "defect_reason")
    private String defectReason;

    @Column(nullable = false, length = 50)
    private String inspector;

    @Column(name = "inspection_time", insertable = false, updatable = false)
    private Timestamp inspectionTime;
}
