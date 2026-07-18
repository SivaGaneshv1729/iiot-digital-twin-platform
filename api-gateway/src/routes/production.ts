import { Router } from 'express';
import { query } from '../db';

const router = Router();

/**
 * @openapi
 * /api/production/summary:
 *   get:
 *     summary: GET operation for /api/production/summary
 *     tags: [production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/summary', async (req, res) => {
    try {
        // Fetch KPI stats
        const activeMachinesResult = await query("SELECT COUNT(*) FROM machines WHERE status = 'Running'");
        const activeMachines = parseInt(activeMachinesResult.rows[0].count);

        const ordersResult = await query("SELECT COALESCE(SUM(target_quantity), 0) as target, COALESCE(SUM(completed_quantity), 0) as completed FROM production_orders");
        
        // Return summary data
        res.json({
            active_machines: activeMachines,
            total_target: parseInt(ordersResult.rows[0].target) || 0,
            total_completed: parseInt(ordersResult.rows[0].completed) || 0,
            efficiency: 85 // Mocked for now, until we calculate real efficiency
        });
    } catch (err) {
        console.error('Error fetching production summary:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * @openapi
 * /api/production/orders:
 *   get:
 *     summary: GET operation for /api/production/orders
 *     tags: [production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/orders', async (req, res) => {
    try {
        const result = await query(`
            SELECT po.*, m.name as machine_name 
            FROM production_orders po
            LEFT JOIN machines m ON po.machine_id = m.id
            ORDER BY po.id DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
