import { Router, Request, Response, NextFunction } from 'express';
import { authGuard } from '../middleware/authGuard';
import { adminGuard } from '../middleware/adminGuard';
import * as bookingService from '../services/bookingService';
import * as adminController from '../controllers/adminController';
import {
  createDeskValidation,
  updateDeskValidation,
  createParkingValidation,
  updateParkingValidation,
} from '../validators/adminValidators';

const router = Router();

// All admin routes require authentication + admin role
router.use(authGuard);
router.use(adminGuard);

// Desk resource management
router.post('/desks', createDeskValidation, adminController.createDesk);
router.put('/desks/:id', updateDeskValidation, adminController.updateDesk);
router.delete('/desks/:id', adminController.deleteDesk);

// Parking spot resource management
router.post('/parking', createParkingValidation, adminController.createParking);
router.put('/parking/:id', updateParkingValidation, adminController.updateParking);
router.delete('/parking/:id', adminController.deleteParking);

/**
 * GET /api/v1/admin/bookings
 * Returns admin booking overview with optional filters.
 * Query params: startDate, endDate (YYYY-MM-DD), resourceType ('desk' | 'parking_spot')
 * Defaults to today → today + 30 days when no date range specified.
 * Returns 200 with bookings list, 400 on validation error.
 */
router.get('/bookings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, resourceType } = req.query;

    // Validate resourceType if provided
    if (resourceType && resourceType !== 'desk' && resourceType !== 'parking_spot') {
      res.status(400).json({ error: 'Invalid resourceType. Must be "desk" or "parking_spot"' });
      return;
    }

    // If one date is provided, both must be provided
    if ((startDate && !endDate) || (!startDate && endDate)) {
      res.status(400).json({ error: 'Both startDate and endDate must be provided together' });
      return;
    }

    const filters: bookingService.BookingOverviewFilters = {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      resourceType: resourceType as 'desk' | 'parking_spot' | undefined,
    };

    const result = await bookingService.getBookingOverview(filters);

    res.status(200).json({ data: result });
  } catch (err: unknown) {
    if (err instanceof Error && 'statusCode' in err) {
      const appErr = err as Error & { statusCode: number };
      res.status(appErr.statusCode).json({ error: appErr.message });
      return;
    }
    next(err);
  }
});

export default router;
