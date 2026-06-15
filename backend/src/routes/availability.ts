import { Router } from 'express';
import { availabilityValidation } from '../validators/availabilityValidators';
import * as availabilityController from '../controllers/availabilityController';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// GET /availability/desks?date=YYYY-MM-DD — Get desk availability for a date
router.get('/desks', authGuard, availabilityValidation, availabilityController.getDeskAvailability);

// GET /availability/parking?date=YYYY-MM-DD — Get parking spot availability for a date
router.get('/parking', authGuard, availabilityValidation, availabilityController.getParkingAvailability);

export default router;
