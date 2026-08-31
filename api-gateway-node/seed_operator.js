require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'smartfactory',
  password: process.env.DB_PASSWORD || 'password123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function seedOperator() {
  try {
    console.log('Seeding operator account...');
    await pool.query(`
      INSERT INTO users (username, password_hash, role) 
      VALUES ('operator', 'hashedpassword', 'Operator')
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('Operator account seeded successfully.');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await pool.end();
  }
}

seedOperator();
