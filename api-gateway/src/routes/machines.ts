import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM machines ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching machines:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('SELECT * FROM machines WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching machine:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch last 50 historical points for charting
        const result = await query(
            'SELECT temperature, status, timestamp as time FROM telemetry_history WHERE machine_id = $1 ORDER BY timestamp DESC LIMIT 50',
            [id]
        );
        // Reverse to get chronological order for charts
        res.json(result.rows.reverse());
    } catch (err) {
        console.error('Error fetching machine history:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
