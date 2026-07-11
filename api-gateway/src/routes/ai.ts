import { Router } from 'express';

const router = Router();
const AI_SERVICE_URL = 'http://localhost:8000';

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
