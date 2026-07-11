import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import machinesRouter from './routes/machines';
import productionRouter from './routes/production';
import aiRouter from './routes/ai';
import authRouter from './routes/auth';
import inventoryRouter from './routes/inventory';
import qualityRouter from './routes/quality';
import { authenticateToken } from './middleware/auth';
import { query } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Simulate Live Telemetry Every 2 Seconds
setInterval(async () => {
    try {
        const result = await query('SELECT id, name, status, temperature, running_hours FROM machines');
        const machines = result.rows.map((m: any) => {
            // Randomly fluctuate temperature slightly for realism
            const tempFluctuation = (Math.random() - 0.5) * 2; // -1.0 to +1.0
            const newTemp = Math.max(20, Math.min(100, parseFloat(m.temperature) + tempFluctuation)).toFixed(1);
            
            // Randomly update status sometimes
            let newStatus = m.status;
            if (m.status !== 'Maintenance' && Math.random() < 0.05) {
                newStatus = Math.random() < 0.8 ? 'Running' : 'Idle';
            }
            
            return {
                id: m.id,
                name: m.name,
                status: newStatus,
                temperature: newTemp,
                running_hours: parseInt(m.running_hours, 10) + (newStatus === 'Running' ? 1 : 0),
            };
        });

        // Broadcast to all connected clients
        io.emit('telemetry_update', machines);

        // Optionally, update the database periodically if needed, but for now we just broadcast the live mock data.
    } catch (err) {
        console.error('Error broadcasting telemetry:', err);
    }
}, 2000);

// Public routes
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'API Gateway is running' });
});
app.use('/api/auth', authRouter);

// Protected routes (require JWT)
app.use('/api/machines', authenticateToken, machinesRouter);
app.use('/api/production', authenticateToken, productionRouter);
app.use('/api/inventory', authenticateToken, inventoryRouter);
app.use('/api/quality', authenticateToken, qualityRouter);
app.use('/api/ai', authenticateToken, aiRouter);

server.listen(PORT, () => {
    console.log(`API Gateway & Socket.io Server running on http://localhost:${PORT}`);
});
