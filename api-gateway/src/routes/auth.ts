import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_smartfactory';

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: POST operation for /api/auth/login
 *     tags: [auth]
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
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 1. Fetch user from DB
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        // 2. Validate password (in a real app, use bcrypt.compare here. We use raw strings for MVP based on init.sql)
        if (user.password_hash !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // 3. Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
