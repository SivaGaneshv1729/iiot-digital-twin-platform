import { Router } from 'express';
import { query } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT a.id, a.action, a.timestamp as time, u.username, u.role
            FROM audit_logs a
            JOIN users u ON a.user_id = u.id
            ORDER BY a.timestamp DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
