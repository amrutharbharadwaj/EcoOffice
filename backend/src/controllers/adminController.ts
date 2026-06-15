import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as resourceService from '../services/resourceService';

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

// Type guard for application errors with statusCode
interface AppError extends Error {
  statusCode?: number;
}

function isAppError(err: unknown): err is AppError {
  return err instanceof Error && 'statusCode' in err;
}

/**
 * POST /api/v1/admin/desks
 * Creates a new desk resource.
 * Returns 201 on success, 400 on validation error, 409 on duplicate identifier.
 */
export async function createDesk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const { identifier, floor } = req.body;
    const result = await resourceService.addDesk(identifier, floor);

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
 * PUT /api/v1/admin/desks/:id
 * Updates an existing desk resource.
 * Returns 200 on success, 400 on validation error, 404 if not found, 409 on duplicate identifier.
 */
export async function updateDesk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const deskId = parseInt(req.params.id, 10);
    if (isNaN(deskId)) {
      res.status(400).json({ error: 'Invalid desk ID' });
      return;
    }

    const data: { identifier?: string; floor?: number } = {};
    if (req.body.identifier !== undefined) data.identifier = req.body.identifier;
    if (req.body.floor !== undefined) data.floor = req.body.floor;

    const result = await resourceService.updateDesk(deskId, data);

    res.status(200).json({ data: result });
  } catch (err: unknown) {
    if (isAppError(err) && err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/desks/:id
 * Deactivates (soft-deletes) a desk resource.
 * Returns 200 on success, 404 if not found, 409 if desk has active bookings.
 */
export async function deleteDesk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deskId = parseInt(req.params.id, 10);
    if (isNaN(deskId)) {
      res.status(400).json({ error: 'Invalid desk ID' });
      return;
    }

    await resourceService.deactivateDesk(deskId);

    res.status(200).json({ data: { message: 'Desk deactivated successfully' } });
  } catch (err: unknown) {
    if (isAppError(err) && err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * POST /api/v1/admin/parking
 * Creates a new parking spot resource.
 * Returns 201 on success, 400 on validation error, 409 on duplicate identifier.
 */
export async function createParking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const { identifier, locationLabel } = req.body;
    const result = await resourceService.addParkingSpot(identifier, locationLabel);

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
 * PUT /api/v1/admin/parking/:id
 * Updates an existing parking spot resource.
 * Returns 200 on success, 400 on validation error, 404 if not found, 409 on duplicate identifier.
 */
export async function updateParking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json(formatValidationErrors(errors));
      return;
    }

    const spotId = parseInt(req.params.id, 10);
    if (isNaN(spotId)) {
      res.status(400).json({ error: 'Invalid parking spot ID' });
      return;
    }

    const data: { identifier?: string; locationLabel?: string } = {};
    if (req.body.identifier !== undefined) data.identifier = req.body.identifier;
    if (req.body.locationLabel !== undefined) data.locationLabel = req.body.locationLabel;

    const result = await resourceService.updateParkingSpot(spotId, data);

    res.status(200).json({ data: result });
  } catch (err: unknown) {
    if (isAppError(err) && err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/parking/:id
 * Deactivates (soft-deletes) a parking spot resource.
 * Returns 200 on success, 404 if not found, 409 if spot has active bookings.
 */
export async function deleteParking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const spotId = parseInt(req.params.id, 10);
    if (isNaN(spotId)) {
      res.status(400).json({ error: 'Invalid parking spot ID' });
      return;
    }

    await resourceService.deactivateParkingSpot(spotId);

    res.status(200).json({ data: { message: 'Parking spot deactivated successfully' } });
  } catch (err: unknown) {
    if (isAppError(err) && err.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
}
