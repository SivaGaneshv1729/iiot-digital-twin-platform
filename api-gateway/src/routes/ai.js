"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
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
    }
    catch (err) {
        console.error('Error in predict maintenance:', err);
        res.status(500).json({ error: 'Failed to contact AI service' });
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
    }
    catch (err) {
        console.error('Error in AI chat:', err);
        res.status(500).json({ error: 'Failed to contact AI service' });
    }
});
exports.default = router;
//# sourceMappingURL=ai.js.map