import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/v1/admin/desks
 * Creates a new desk resource.
 * Returns 201 on success, 400 on validation error, 409 on duplicate identifier.
 */
export declare function createDesk(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * PUT /api/v1/admin/desks/:id
 * Updates an existing desk resource.
 * Returns 200 on success, 400 on validation error, 404 if not found, 409 on duplicate identifier.
 */
export declare function updateDesk(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * DELETE /api/v1/admin/desks/:id
 * Deactivates (soft-deletes) a desk resource.
 * Returns 200 on success, 404 if not found, 409 if desk has active bookings.
 */
export declare function deleteDesk(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /api/v1/admin/parking
 * Creates a new parking spot resource.
 * Returns 201 on success, 400 on validation error, 409 on duplicate identifier.
 */
export declare function createParking(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * PUT /api/v1/admin/parking/:id
 * Updates an existing parking spot resource.
 * Returns 200 on success, 400 on validation error, 404 if not found, 409 on duplicate identifier.
 */
export declare function updateParking(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * DELETE /api/v1/admin/parking/:id
 * Deactivates (soft-deletes) a parking spot resource.
 * Returns 200 on success, 404 if not found, 409 if spot has active bookings.
 */
export declare function deleteParking(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=adminController.d.ts.map