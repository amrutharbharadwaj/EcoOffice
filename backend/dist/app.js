"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachErrorHandler = attachErrorHandler;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const pool_1 = __importDefault(require("./db/pool"));
const index_1 = __importDefault(require("./routes/index"));
const escapeHtml_1 = require("./utils/escapeHtml");
const app = (0, express_1.default)();
// 1. CORS — Allow frontend origin
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
// 2. Body Parser — JSON parsing with content-type enforcement
// Reject requests with a body but wrong Content-Type
app.use((req, res, next) => {
    const hasBody = req.headers['content-length'] && parseInt(req.headers['content-length'], 10) > 0;
    const isTransferEncoded = !!req.headers['transfer-encoding'];
    if ((hasBody || isTransferEncoded) && !req.is('application/json')) {
        res.status(400).json({ error: 'Content-Type must be application/json' });
        return;
    }
    next();
});
app.use(express_1.default.json());
// 3. Session Middleware — express-session with connect-pg-simple store
const PgSession = (0, connect_pg_simple_1.default)(express_session_1.default);
app.use((0, express_session_1.default)({
    store: new PgSession({
        pool: pool_1.default,
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
app.use('/api/v1', index_1.default);
/**
 * Attaches the centralized error handler. Must be called after all routes are registered.
 */
function attachErrorHandler(expressApp) {
    expressApp.use((err, _req, res, _next) => {
        const status = err.statusCode || 500;
        const response = {
            error: (0, escapeHtml_1.escapeHtml)(err.message || 'Internal server error'),
        };
        if (err.fields) {
            response.fields = err.fields.map((f) => ({
                field: (0, escapeHtml_1.escapeHtml)(f.field),
                message: (0, escapeHtml_1.escapeHtml)(f.message),
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
exports.default = app;
//# sourceMappingURL=app.js.map