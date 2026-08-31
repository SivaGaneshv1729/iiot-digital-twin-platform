import { Router } from 'express';
import webpush from 'web-push';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const publicVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const privateVapidKey = 'UU1C4w8zB3m6f5N4n3eZ1pX_w_Q5qM4T0x-9Y1M1F8I';

webpush.setVapidDetails(
  'mailto:test@smartfactory.ai',
  publicVapidKey,
  privateVapidKey
);

export const subscriptions: webpush.PushSubscription[] = [];

/**
 * @openapi
 * /api/push/vapidPublicKey:
 *   get:
 *     summary: GET operation for /api/push/vapidPublicKey
 *     tags: [push]
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
router.get('/vapidPublicKey', authenticateToken, (req, res) => {
    res.send(publicVapidKey);
});

/**
 * @openapi
 * /api/push/subscribe:
 *   post:
 *     summary: POST operation for /api/push/subscribe
 *     tags: [push]
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
router.post('/subscribe', authenticateToken, (req, res) => {
    const subscription = req.body;
    subscriptions.push(subscription);
    res.status(201).json({});
});

export const triggerEmergencyPush = () => {
    const payload = JSON.stringify({
        title: 'CRITICAL ALERT',
        body: 'EMERGENCY STOP (JIDOKA) ACTIVATED. ALL MACHINES HALTED.',
    });
    subscriptions.forEach(sub => {
        webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
    });
};

export default router;
