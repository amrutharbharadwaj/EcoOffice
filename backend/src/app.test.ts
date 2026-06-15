import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { AppError, attachErrorHandler } from './app';

/**
 * Creates a minimal test app that mirrors the production middleware stack
 * but without requiring a real database connection for session store.
 */
function createTestApp() {
  const app = express();

  // CORS
  const cors = require('cors');
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));

  // Content-type enforcement
  app.use((req: Request, res: Response, next: NextFunction) => {
    const hasBody = req.headers['content-length'] && parseInt(req.headers['content-length'], 10) > 0;
    const isTransferEncoded = !!req.headers['transfer-encoding'];

    if ((hasBody || isTransferEncoded) && !req.is('application/json')) {
      res.status(400).json({ error: 'Content-Type must be application/json' });
      return;
    }
    next();
  });

  app.use(express.json());

  // Test routes
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/v1/test/error', (_req, _res, next) => {
    const err: any = new Error('Test error');
    err.statusCode = 422;
    next(err);
  });

  app.get('/api/v1/test/error-fields', (_req, _res, next) => {
    const err: any = new Error('Validation failed');
    err.statusCode = 400;
    err.fields = [{ field: 'email', message: 'Invalid email' }];
    next(err);
  });

  app.get('/api/v1/test/error-500', (_req, _res, next) => {
    next(new Error('Something broke'));
  });

  // Attach error handler last
  attachErrorHandler(app);

  return app;
}

describe('Express App Middleware Stack', () => {
  const app = createTestApp();

  describe('CORS', () => {
    it('should include CORS headers in responses', async () => {
      const res = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('Content-Type Enforcement', () => {
    it('should reject requests with a body but wrong Content-Type', async () => {
      const res = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'text/plain')
        .send('some text body');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content-Type must be application/json');
    });

    it('should allow requests with application/json Content-Type', async () => {
      const res = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ test: true }));

      // Not a 400 content-type error (might be 404 since POST /health isn't defined)
      expect(res.status).not.toBe(400);
    });

    it('should allow GET requests without Content-Type', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('API Versioning', () => {
    it('should serve routes under /api/v1 prefix', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('should return 404 for routes without /api/v1 prefix', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(404);
    });
  });

  describe('Centralized Error Handler', () => {
    it('should return structured error response with statusCode', async () => {
      const res = await request(app).get('/api/v1/test/error');

      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: 'Test error' });
    });

    it('should include fields when present on error', async () => {
      const res = await request(app).get('/api/v1/test/error-fields');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: 'Validation failed',
        fields: [{ field: 'email', message: 'Invalid email' }],
      });
    });

    it('should default to 500 for unhandled errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const res = await request(app).get('/api/v1/test/error-500');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Something broke' });

      consoleSpy.mockRestore();
    });
  });
});
