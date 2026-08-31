package com.smartfactory.apigateway.repository;

import com.smartfactory.apigateway.model.ProductionOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductionOrderRepository extends JpaRepository<ProductionOrder, Long> {
    List<ProductionOrder> findAllByOrderByCreatedAtDesc();
}
