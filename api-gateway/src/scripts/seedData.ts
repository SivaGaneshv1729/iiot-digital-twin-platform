import { query } from '../db';

async function seed() {
  console.log('Initializing and Seeding Database...');
  
  try {
    // 1. Users
    await query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert admin if not exists
    const adminCheck = await query(`SELECT * FROM users WHERE username = 'admin'`);
    if (adminCheck.rows.length === 0) {
        await query(`INSERT INTO users (username, password_hash, role) VALUES ('admin', 'hashedpassword', 'Admin');`);
    }

    // 2. Machines
    await query(`
      CREATE TABLE IF NOT EXISTS machines (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          status VARCHAR(20) NOT NULL,
          temperature DECIMAL(5,2),
          running_hours INTEGER DEFAULT 0,
          last_maintenance TIMESTAMP
      );
    `);
    
    const countMachines = await query('SELECT COUNT(*) FROM machines');
    if (parseInt(countMachines.rows[0].count) === 0) {
      // Need to reset sequence if we force insert IDs, but omitting ID is safer
      await query(`
        INSERT INTO machines (id, name, status, temperature, running_hours) VALUES 
        (1, 'M-101', 'Running', 65.5, 1200),
        (2, 'M-102', 'Idle', 30.0, 800),
        (3, 'M-103', 'Maintenance', 45.2, 5000),
        (4, 'Robot Arm X', 'Running', 55.0, 300),
        (5, 'Conveyor Belt A', 'Running', 40.0, 4500)
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('Machines seeded.');
    }

    // 3. Production Orders
    await query(`
      CREATE TABLE IF NOT EXISTS production_orders (
          id SERIAL PRIMARY KEY,
          machine_id INTEGER REFERENCES machines(id),
          status VARCHAR(20) NOT NULL,
          target_quantity INTEGER NOT NULL,
          completed_quantity INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Inventory
    await query(`
      CREATE TABLE IF NOT EXISTS inventory (
          id SERIAL PRIMARY KEY,
          item_name VARCHAR(100) NOT NULL,
          category VARCHAR(50) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          unit VARCHAR(20) NOT NULL,
          min_threshold INTEGER NOT NULL DEFAULT 100,
          location VARCHAR(50),
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    const countInventory = await query('SELECT COUNT(*) FROM inventory');
    if (parseInt(countInventory.rows[0].count) === 0) {
      await query(`
        INSERT INTO inventory (item_name, category, quantity, unit, min_threshold, location) VALUES
        ('Steel Sheets (Grade A)', 'Raw Material', 2500, 'kg', 500, 'Warehouse A-1'),
        ('Aluminum Coils', 'Raw Material', 800, 'kg', 1000, 'Warehouse A-2'),
        ('Circuit Boards v2', 'Component', 450, 'pcs', 500, 'Warehouse B-1'),
        ('Hydraulic Fluid', 'Consumable', 120, 'liters', 50, 'Storage C'),
        ('Assembled Engine Block', 'Finished Good', 45, 'units', 20, 'Warehouse Outbound')
      `);
      console.log('Inventory seeded.');
    }

    // 5. Quality Inspections
    await query(`
      CREATE TABLE IF NOT EXISTS quality_inspections (
          id SERIAL PRIMARY KEY,
          batch_number VARCHAR(50) NOT NULL,
          machine_id INTEGER REFERENCES machines(id),
          product_name VARCHAR(100) NOT NULL,
          status VARCHAR(20) NOT NULL,
          defect_reason VARCHAR(255),
          inspector VARCHAR(50) NOT NULL,
          inspection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    const countQuality = await query('SELECT COUNT(*) FROM quality_inspections');
    if (parseInt(countQuality.rows[0].count) === 0) {
      await query(`
        INSERT INTO quality_inspections (batch_number, machine_id, product_name, status, defect_reason, inspector, inspection_time) VALUES
        ('B-9021', 1, 'Steel Frame', 'Pass', NULL, 'Jane Doe', NOW() - INTERVAL '2 hours'),
        ('B-9022', 1, 'Steel Frame', 'Pass', NULL, 'Jane Doe', NOW() - INTERVAL '1 hour'),
        ('B-9023', 2, 'Aluminum Coil', 'Fail', 'Micro-fractures detected', 'John Smith', NOW() - INTERVAL '45 minutes'),
        ('B-9024', 3, 'Circuit Board', 'Pass', NULL, 'Jane Doe', NOW() - INTERVAL '30 minutes'),
        ('B-9025', 3, 'Circuit Board', 'Fail', 'Soldering defect', 'John Smith', NOW() - INTERVAL '10 minutes')
      `);
      console.log('Quality inspections seeded.');
    }

    // 6. Audit Logs
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          action VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert fake audit logs if empty
    const countAudit = await query('SELECT COUNT(*) FROM audit_logs');
    if (parseInt(countAudit.rows[0].count) === 0) {
      await query(`
        INSERT INTO audit_logs (user_id, action) VALUES
        (1, 'System Administrator (admin) logged in'),
        (1, 'Updated machine M-101 status to Running'),
        (1, 'Triggered AI Retraining Loop'),
        (1, 'Generated Quality Assurance PDF Report')
      `);
      console.log('Audit logs seeded.');
    }

    console.log('All tables initialized and seeded successfully.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    process.exit(0);
  }
}

seed();
