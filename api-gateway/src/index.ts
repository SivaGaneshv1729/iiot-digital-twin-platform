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
import auditRouter from './routes/audit';
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

import Redis from 'ioredis';

// Redis Configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

const redisPublisher = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
const redisSubscriber = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

const TELEMETRY_CHANNEL = 'iot:machine:telemetry';

// Subscribe to Redis Channel and forward to WebSockets
redisSubscriber.subscribe(TELEMETRY_CHANNEL, (err, count) => {
    if (err) {
        console.error('Failed to subscribe to Redis telemetry channel:', err);
    } else {
        console.log(`Subscribed to Redis channel: ${TELEMETRY_CHANNEL}`);
    }
});

redisSubscriber.on('message', (channel, message) => {
    if (channel === TELEMETRY_CHANNEL) {
        // We received a message from the message broker. Forward it to UI clients.
        const telemetryData = JSON.parse(message);
        io.emit('telemetry_update', telemetryData);
    }
});

// Simulate "IoT Edge Device" publishing to Redis Message Broker
setInterval(async () => {
    try {
        const result = await query('SELECT id, name, status, temperature, running_hours FROM machines');
        const machines = result.rows.map((m: any) => {
            const tempFluctuation = (Math.random() - 0.5) * 2;
            const newTemp = Math.max(20, Math.min(100, parseFloat(m.temperature) + tempFluctuation)).toFixed(1);
            
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

        // Publish to Redis instead of emitting directly
        redisPublisher.publish(TELEMETRY_CHANNEL, JSON.stringify(machines));

        // Periodically log to telemetry_history (every 10 seconds to save DB writes)
        // We'll use a simple static counter or just Math.random to throttle DB writes
        if (Math.random() < 0.2) {
            for (const m of machines) {
                await query(
                    'INSERT INTO telemetry_history (machine_id, temperature, status) VALUES ($1, $2, $3)',
                    [m.id, m.temperature, m.status]
                );
            }
        }

        // Phase 14: Supply Chain Integration - Deplete inventory based on production
        const runningMachines = machines.filter((m: any) => m.status === 'Running');
        if (runningMachines.length > 0) {
            // Deplete a random raw material (e.g. IDs 1, 2, 3) by a random amount (1-5)
            const randomItemId = Math.floor(Math.random() * 3) + 1;
            const depletionAmount = Math.floor(Math.random() * 5) + 1;
            
            await query(
                'UPDATE inventory SET quantity = quantity - $1 WHERE id = $2 AND quantity > 0',
                [depletionAmount, randomItemId]
            );
            
            // Broadcast the new inventory levels to all clients
            const invResult = await query('SELECT * FROM inventory ORDER BY category, item_name');
            io.emit('inventory_update', invResult.rows);
        }

    } catch (err) {
        console.error('Error generating mock telemetry:', err);
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
app.use('/api/audit', authenticateToken, auditRouter);

server.listen(PORT, () => {
    console.log(`API Gateway & Socket.io Server running on http://localhost:${PORT}`);
});
