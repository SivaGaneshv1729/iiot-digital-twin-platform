import { Router } from 'express';
import { query } from '../db';

const router = Router();

// Auto-migrate function for Quality Inspections table
const ensureQualityTable = async () => {
    const createTableQuery = `
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
    `;
    await query(createTableQuery);

    // Check if empty, then seed
    const countRes = await query('SELECT COUNT(*) FROM quality_inspections');
    if (parseInt(countRes.rows[0].count) === 0) {
        const seedQuery = `
            INSERT INTO quality_inspections (batch_number, machine_id, product_name, status, defect_reason, inspector, inspection_time) VALUES
            ('B-9021', 1, 'Steel Frame', 'Pass', NULL, 'Jane Doe', NOW() - INTERVAL '2 hours'),
            ('B-9022', 1, 'Steel Frame', 'Pass', NULL, 'Jane Doe', NOW() - INTERVAL '1 hour'),
            ('B-9023', 2, 'Aluminum Coil', 'Fail', 'Micro-fractures detected', 'John Smith', NOW() - INTERVAL '45 minutes'),
            ('B-9024', 3, 'Circuit Board', 'Pass', NULL, 'Jane Doe', NOW() - INTERVAL '30 minutes'),
            ('B-9025', 3, 'Circuit Board', 'Fail', 'Soldering defect', 'John Smith', NOW() - INTERVAL '10 minutes')
        `;
        await query(seedQuery);
        console.log("Seeded quality_inspections table.");
    }
};

// Initialize table on route load
ensureQualityTable().catch(err => console.error("Failed to initialize quality table:", err));

router.get('/', async (req, res) => {
    try {
        const result = await query(`
            SELECT q.*, m.name as machine_name 
            FROM quality_inspections q
            LEFT JOIN machines m ON q.machine_id = m.id
            ORDER BY q.inspection_time DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching quality data:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const passRes = await query("SELECT COUNT(*) FROM quality_inspections WHERE status = 'Pass'");
        const failRes = await query("SELECT COUNT(*) FROM quality_inspections WHERE status = 'Fail'");
        
        const passed = parseInt(passRes.rows[0].count);
        const failed = parseInt(failRes.rows[0].count);
        const total = passed + failed;
        const defectRate = total > 0 ? ((failed / total) * 100).toFixed(1) : 0;

        res.json({
            total_inspections: total,
            passed,
            failed,
            defect_rate: defectRate
        });
    } catch (err) {
        console.error('Error fetching quality stats:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
