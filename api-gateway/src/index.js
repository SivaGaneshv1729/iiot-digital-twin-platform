"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const machines_1 = __importDefault(require("./routes/machines"));
const production_1 = __importDefault(require("./routes/production"));
const ai_1 = __importDefault(require("./routes/ai"));
const auth_1 = __importDefault(require("./routes/auth"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const quality_1 = __importDefault(require("./routes/quality"));
const auth_2 = require("./middleware/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Public routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'API Gateway is running' });
});
app.use('/api/auth', auth_1.default);
// Protected routes (require JWT)
app.use('/api/machines', auth_2.authenticateToken, machines_1.default);
app.use('/api/production', auth_2.authenticateToken, production_1.default);
app.use('/api/inventory', auth_2.authenticateToken, inventory_1.default);
app.use('/api/quality', auth_2.authenticateToken, quality_1.default);
app.use('/api/ai', auth_2.authenticateToken, ai_1.default);
app.listen(PORT, () => {
    console.log(`API Gateway is running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map