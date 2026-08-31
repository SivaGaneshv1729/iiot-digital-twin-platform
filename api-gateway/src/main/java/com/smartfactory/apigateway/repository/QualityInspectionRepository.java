package com.smartfactory.apigateway.repository;

import com.smartfactory.apigateway.model.QualityInspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public interface QualityInspectionRepository extends JpaRepository<QualityInspection, Long> {
    
    List<QualityInspection> findAllByOrderByInspectionTimeDesc();

    long countByStatus(String status);

    @Query("SELECT q.defectReason as name, COUNT(q) as count FROM QualityInspection q WHERE q.status = 'Fail' AND q.defectReason IS NOT NULL GROUP BY q.defectReason ORDER BY COUNT(q) DESC")
    List<Map<String, Object>> countDefectTypes();
}
