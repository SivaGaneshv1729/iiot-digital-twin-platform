import { Router } from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/auth';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();

// Auto-migrate function for Inventory table
const ensureInventoryTable = async () => {
    const createTableQuery = `
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
    `;
    await query(createTableQuery);

    // Check if empty, then seed
    const countRes = await query('SELECT COUNT(*) FROM inventory');
    if (parseInt(countRes.rows[0].count) === 0) {
        const seedQuery = `
            INSERT INTO inventory (item_name, category, quantity, unit, min_threshold, location) VALUES
            ('Steel Sheets (Grade A)', 'Raw Material', 2500, 'kg', 500, 'Warehouse A-1'),
            ('Aluminum Coils', 'Raw Material', 800, 'kg', 1000, 'Warehouse A-2'),
            ('Circuit Boards v2', 'Component', 450, 'pcs', 500, 'Warehouse B-1'),
            ('Hydraulic Fluid', 'Consumable', 120, 'liters', 50, 'Storage C'),
            ('Assembled Engine Block', 'Finished Good', 45, 'units', 20, 'Warehouse Outbound')
        `;
        await query(seedQuery);
        console.log("Seeded inventory table.");
    }
};

// Initialize table on route load
ensureInventoryTable().catch(err => console.error("Failed to initialize inventory table:", err));

router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM inventory ORDER BY category, item_name');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
