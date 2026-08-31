package com.smartfactory.apigateway.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.sql.Timestamp;

@Entity
@Table(name = "production_orders")
@Data
@NoArgsConstructor
public class ProductionOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "target_quantity", nullable = false)
    private Integer targetQuantity;

    @Column(name = "completed_quantity")
    private Integer completedQuantity = 0;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Timestamp createdAt;
}
