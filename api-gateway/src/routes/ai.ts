import { Router } from 'express';

const router = Router();
const AI_SERVICE_URL = 'http://localhost:8000';

/**
 * @route POST /api/ai/predict/maintenance
 * @description Proxies real-time telemetry to the Python FastApi service.
 * Utilizes the FFNN to predict equipment failure probabilities.
 */
/**
 * @openapi
 * /api/ai/predict/maintenance:
 *   post:
 *     summary: POST operation for /api/ai/predict/maintenance
 *     tags: [ai]
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
router.post('/predict/maintenance', async (req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/predict/maintenance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            throw new Error(`AI Service returned ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Error in predict maintenance:', err);
        res.status(500).json({ error: 'Failed to contact AI service' });
    }
});

/**
 * @openapi
 * /api/ai/forecast/temperature:
 *   post:
 *     summary: POST operation for /api/ai/forecast/temperature
 *     tags: [ai]
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
router.post('/forecast/temperature', async (req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/forecast/temperature`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            throw new Error(`AI Service returned ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Error in forecast temperature:', err);
        res.status(500).json({ error: 'Failed to contact AI service for forecasting' });
    }
});

/**
 * @openapi
 * /api/ai/chat:
 *   post:
 *     summary: POST operation for /api/ai/chat
 *     tags: [ai]
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
router.post('/chat', async (req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) {
            throw new Error(`AI Service returned ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Error in AI chat:', err);
        res.status(500).json({ error: 'Failed to contact AI service' });
    }
});

/**
 * @openapi
 * /api/ai/metrics:
 *   get:
 *     summary: GET operation for /api/ai/metrics
 *     tags: [ai]
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
router.get('/metrics', async (req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/predict/metrics`);
        if (!response.ok) {
            throw new Error(`AI Service returned ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Error fetching metrics:', err);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

/**
 * @openapi
 * /api/ai/train:
 *   post:
 *     summary: POST operation for /api/ai/train
 *     tags: [ai]
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
router.post('/train', async (req, res) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/train`, {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error(`AI Service returned ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('Error triggering training:', err);
        res.status(500).json({ error: 'Failed to trigger model training' });
    }
});

export default router;
