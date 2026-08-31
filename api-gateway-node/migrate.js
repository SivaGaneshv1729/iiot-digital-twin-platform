require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'smartfactory',
  password: process.env.DB_PASSWORD || 'password123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS telemetry_history (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER REFERENCES machines(id),
      temperature DECIMAL(5,2),
      status VARCHAR(20),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_telemetry_history_machine_id_timestamp ON telemetry_history (machine_id, timestamp DESC);
  `;

  try {
    console.log('Running migration to create telemetry_history table...');
    await pool.query(queryText);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
