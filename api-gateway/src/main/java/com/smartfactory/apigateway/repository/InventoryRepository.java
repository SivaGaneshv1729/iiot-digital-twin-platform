package com.smartfactory.apigateway.repository;

import com.smartfactory.apigateway.model.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    List<Inventory> findAllByOrderByCategoryAscItemNameAsc();
}
