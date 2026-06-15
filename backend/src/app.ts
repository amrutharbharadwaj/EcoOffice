import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pool from './db/pool';
import apiRouter from './routes/index';
import { escapeHtml } from './utils/escapeHtml';

export interface AppError extends Error {
  statusCode?: number;
  fields?: Array<{ field: string; message: string }>;
}

const app = express();

// 1. CORS — Allow frontend origin
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// 2. Body Parser — JSON parsing with content-type enforcement
// Reject requests with a body but wrong Content-Type
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

// 3. Session Middleware — express-session with connect-pg-simple store
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool,
    tableName: 'sessions',
    createTableIfMissing: false,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
}));

// API v1 router prefix
app.use('/api/v1', apiRouter);

/**
 * Attaches the centralized error handler. Must be called after all routes are registered.
 */
export function attachErrorHandler(expressApp: express.Express): void {
  expressApp.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode || 500;
    const response: { error: string; fields?: Array<{ field: string; message: string }> } = {
      error: escapeHtml(err.message || 'Internal server error'),
    };

    if (err.fields) {
      response.fields = err.fields.map((f) => ({
        field: escapeHtml(f.field),
        message: escapeHtml(f.message),
      }));
    }

    if (status === 500) {
      console.error('Unhandled error:', err);
    }

    res.status(status).json(response);
  });
}

// Attach error handler (must be last)
attachErrorHandler(app);

export default app;
