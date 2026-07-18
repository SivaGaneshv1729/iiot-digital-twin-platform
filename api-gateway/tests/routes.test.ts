import request from 'supertest';
import app from '../src/index';

describe('API Gateway Routes Integration Test', () => {
  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/machines without token should return 401 Unauthorized', async () => {
    const res = await request(app).get('/api/machines');
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized: Token missing');
  });
});
