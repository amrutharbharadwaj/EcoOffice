import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as bookingService from '../services/bookingService';

/**
 * Maps express-validator errors to the standard error response format.
 */
function formatValidationErrors(errors: ReturnType<typeof validationResult>) {
  const fieldErrors = errors.array().map((err) => ({
    field: (err as { path: string }).path,
    message: err.msg,
  }));

  return {
    error: 'Validation failed',
    fields: fieldErrors,
  };
}

/**
 * POST /api/v1/bookings/desks
 * Books a desk for a specific date.
 * Returns 201 on success, 400 on validation error, 404 if desk not found, 409 on conflict.
 */
export async function bookDesk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const { deskId, date } = req.body;
    const result = await bookingService.createDeskBooking(req.user!.id, deskId, new Date(date));

    res.status(201).json({ data: result });
  } catch (err: unknown) {
    if (isAppError(err) && err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * POST /api/v1/bookings/parking
 * Books a parking spot for a specific date.
 * Returns 201 on success, 400 on validation error, 404 if spot not found, 409 on conflict.
 */
export async function bookParking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const { parkingSpotId, date } = req.body;
    const result = await bookingService.createParkingBooking(req.user!.id, parkingSpotId, new Date(date));

    res.status(201).json({ data: result });
  } catch (err: unknown) {
    if (isAppError(err) && err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * DELETE /api/v1/bookings/:id
 * Cancels a booking owned by the authenticated user.
 * Returns 200 on success, 403 if not owner, 404 if not found.
 */
export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = parseInt(req.params.id, 10);

    if (isNaN(bookingId)) {
      res.status(400).json({ error: 'Invalid booking ID' });
      return;
    }

    await bookingService.cancelBooking(req.user!.id, bookingId);

    res.status(200).json({ data: { message: 'Booking cancelled successfully' } });
  } catch (err: unknown) {
    if (isAppError(err) && err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * GET /api/v1/bookings/mine
 * Returns all upcoming bookings for the authenticated user.
 * Response includes resource_type, resource_identifier, and booking_date for each booking.
 * When no upcoming bookings exist, returns an empty array with an informational message.
 */
export async function getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookings = await bookingService.getUserBookings(req.user!.id);

    const formattedBookings = bookings.map((b) => ({
      id: b.id,
      resource_type: b.resource_type,
      resource_identifier: b.resource_identifier,
      booking_date: b.booking_date,
    }));

    if (formattedBookings.length === 0) {
      res.status(200).json({
        data: {
          bookings: [],
          message: 'No upcoming bookings found',
        },
      });
      return;
    }

    res.status(200).json({
      data: {
        bookings: formattedBookings,
      },
    });
  } catch (err: unknown) {
    if (isAppError(err) && err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

// Type guard

interface AppError extends Error {
  statusCode?: number;
}

function isAppError(err: unknown): err is AppError {
  return err instanceof Error && 'statusCode' in err;
}
