import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/v1/bookings/desks
 * Books a desk for a specific date.
 * Returns 201 on success, 400 on validation error, 404 if desk not found, 409 on conflict.
 */
export declare function bookDesk(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * POST /api/v1/bookings/parking
 * Books a parking spot for a specific date.
 * Returns 201 on success, 400 on validation error, 404 if spot not found, 409 on conflict.
 */
export declare function bookParking(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * DELETE /api/v1/bookings/:id
 * Cancels a booking owned by the authenticated user.
 * Returns 200 on success, 403 if not owner, 404 if not found.
 */
export declare function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * GET /api/v1/bookings/mine
 * Returns all upcoming bookings for the authenticated user.
 * Response includes resource_type, resource_identifier, and booking_date for each booking.
 * When no upcoming bookings exist, returns an empty array with an informational message.
 */
export declare function getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=bookingController.d.ts.map