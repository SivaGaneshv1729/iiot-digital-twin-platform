const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'smartfactory',
});

async function addMachines() {
  try {
    await pool.query(`
      INSERT INTO machines (id, name, status, temperature, running_hours) VALUES 
      (6, 'Ohta Assembly M-01', 'Running', 45.2, 120),
      (7, 'Ohta Assembly M-02', 'Running', 46.0, 150),
      (8, 'Precision Welder X', 'Idle', 25.5, 900),
      (9, 'Motor Tester Alpha', 'Running', 60.1, 400),
      (10, 'Paint Booth Bot', 'Running', 35.0, 1000)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        status = EXCLUDED.status, 
        temperature = EXCLUDED.temperature;
    `);
    console.log('Added 5 new machines to Ohta Works successfully.');
  } catch (err) {
    console.error('Error inserting machines:', err);
  } finally {
    pool.end();
  }
}

addMachines();
