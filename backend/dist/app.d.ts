import express from 'express';
export interface AppError extends Error {
    statusCode?: number;
    fields?: Array<{
        field: string;
        message: string;
    }>;
}
declare const app: import("express-serve-static-core").Express;
/**
 * Attaches the centralized error handler. Must be called after all routes are registered.
 */
export declare function attachErrorHandler(expressApp: express.Express): void;
export default app;
//# sourceMappingURL=app.d.ts.map