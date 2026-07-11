import { Router } from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/auth';

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

router.post('/:id/status', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const user = (req as any).user;
        
        if (!['Running', 'Idle', 'Maintenance'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        await query('UPDATE machines SET status = $1 WHERE id = $2', [status, id]);
        
        // Log the action in the audit ledger
        const actionText = `Set Machine M-${100+parseInt(id)} to ${status}`;
        await query('INSERT INTO audit_logs (user_id, action) VALUES ($1, $2)', [user.id, actionText]);

        res.json({ message: `Machine ${id} status updated to ${status}` });
    } catch (err) {
        console.error('Error updating machine status:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
