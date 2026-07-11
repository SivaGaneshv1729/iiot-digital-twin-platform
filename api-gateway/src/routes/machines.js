"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const result = await (0, db_1.query)('SELECT * FROM machines ORDER BY id ASC');
        res.json(result.rows);
    }
    catch (err) {
        console.error('Error fetching machines:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await (0, db_1.query)('SELECT * FROM machines WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error('Error fetching machine:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;
//# sourceMappingURL=machines.js.map