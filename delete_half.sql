CREATE TEMP TABLE del_mach AS SELECT id FROM machines ORDER BY random() LIMIT (SELECT count(*)/2 FROM machines);
DELETE FROM telemetry_history WHERE machine_id IN (SELECT id FROM del_mach);
DELETE FROM production_orders WHERE machine_id IN (SELECT id FROM del_mach);
DELETE FROM machines WHERE id IN (SELECT id FROM del_mach);
