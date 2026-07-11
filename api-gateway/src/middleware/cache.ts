import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Create a dedicated Redis client for caching
const redisCache = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

/**
 * Express middleware to cache API responses in Redis.
 * @param durationSeconds How long to keep the data in the cache.
 */
export const cacheMiddleware = (durationSeconds: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET') {
            return next();
        }

        // Use the request URL as the unique cache key
        const key = `__express__${req.originalUrl || req.url}`;

        try {
            const cachedBody = await redisCache.get(key);
            if (cachedBody) {
                // Cache hit! Return data immediately
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('Content-Type', 'application/json');
                return res.send(cachedBody);
            } else {
                // Cache miss. We must intercept the res.json method to save the data before sending it
                res.setHeader('X-Cache', 'MISS');
                const originalJson = res.json.bind(res);
                
                res.json = (body: any) => {
                    // Save the response to Redis with an expiration
                    redisCache.setex(key, durationSeconds, JSON.stringify(body)).catch(err => {
                        console.error('Redis Cache Write Error:', err);
                    });
                    return originalJson(body);
                };
                
                next();
            }
        } catch (err) {
            console.error('Redis Cache Read Error:', err);
            next(); // Fallback to database on Redis failure
        }
    };
};
