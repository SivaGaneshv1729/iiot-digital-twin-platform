package com.smartfactory.apigateway.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.sql.Timestamp;

@Entity
@Table(name = "inventory")
@Data
@NoArgsConstructor
public class Inventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_name", nullable = false, length = 100)
    private String itemName;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    private Integer quantity = 0;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(name = "min_threshold", nullable = false)
    private Integer minThreshold = 100;

    @Column(length = 50)
    private String location;

    @Column(name = "last_updated", insertable = false, updatable = false)
    private Timestamp lastUpdated;
}
