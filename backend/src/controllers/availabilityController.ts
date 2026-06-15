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
 * GET /api/v1/availability/desks?date=YYYY-MM-DD
 * Returns all active desks with their booking status for the given date.
 */
export async function getDeskAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const date = req.query.date as string;
    const data = await bookingService.getDeskAvailability(date);

    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/availability/parking?date=YYYY-MM-DD
 * Returns all active parking spots with their booking status for the given date.
 */
export async function getParkingAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const date = req.query.date as string;
    const data = await bookingService.getParkingAvailability(date);

    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
