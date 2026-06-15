import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/v1/availability/desks?date=YYYY-MM-DD
 * Returns all active desks with their booking status for the given date.
 */
export declare function getDeskAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /api/v1/availability/parking?date=YYYY-MM-DD
 * Returns all active parking spots with their booking status for the given date.
 */
export declare function getParkingAvailability(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=availabilityController.d.ts.map