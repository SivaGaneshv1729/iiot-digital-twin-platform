CREATE TEMP TABLE IF NOT EXISTS del_mach_55 AS SELECT id FROM machines ORDER BY random() LIMIT 55;
DELETE FROM telemetry_history WHERE machine_id IN (SELECT id FROM del_mach_55);
DELETE FROM production_orders WHERE machine_id IN (SELECT id FROM del_mach_55);
DELETE FROM quality_inspections WHERE machine_id IN (SELECT id FROM del_mach_55);
DELETE FROM machines WHERE id IN (SELECT id FROM del_mach_55);
