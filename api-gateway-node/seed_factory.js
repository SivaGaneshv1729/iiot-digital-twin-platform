const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'smartfactory',
});

async function seedFactory() {
  const machines = [];
  let idCounter = 11; // Starting after the existing 10 machines

  const generateBlock = (prefix, type, count) => {
    for (let i = 1; i <= count; i++) {
      const status = Math.random() > 0.1 ? 'Running' : (Math.random() > 0.5 ? 'Idle' : 'Offline');
      const temp = 30 + Math.random() * 50;
      const hours = Math.floor(Math.random() * 5000);
      machines.push(`(${idCounter++}, '${prefix} ${type} ${i.toString().padStart(2, '0')}', '${status}', ${temp.toFixed(1)}, ${hours})`);
    }
  };

  // Generate 200+ machines
  generateBlock('Block A', 'CNC', 30);
  generateBlock('Block B', 'Assembly Bot', 40);
  generateBlock('Block E', 'Casting Press', 20);
  generateBlock('Block F', 'Welding Arm', 50);
  generateBlock('Block G', 'Chem Vat', 30);
  generateBlock('Block H', 'Weaver', 40);

  const query = `
    INSERT INTO machines (id, name, status, temperature, running_hours) VALUES 
    ${machines.join(',\n    ')}
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name, 
      status = EXCLUDED.status, 
      temperature = EXCLUDED.temperature,
      running_hours = EXCLUDED.running_hours;
  `;

  try {
    await pool.query(query);
    console.log(`Successfully seeded ${machines.length} machines into the database!`);
  } catch (err) {
    console.error('Error seeding machines:', err);
  } finally {
    pool.end();
  }
}

seedFactory();
