import { Router } from 'express';
import { deskBookingValidation, parkingBookingValidation } from '../validators/bookingValidators';
import * as bookingController from '../controllers/bookingController';
import { authGuard } from '../middleware/authGuard';

const router = Router();

// All booking routes require authentication
router.use(authGuard);

// POST /bookings/desks — Book a desk
router.post('/desks', deskBookingValidation, bookingController.bookDesk);

// POST /bookings/parking — Book a parking spot
router.post('/parking', parkingBookingValidation, bookingController.bookParking);

// DELETE /bookings/:id — Cancel a booking
router.delete('/:id', bookingController.cancelBooking);

// GET /bookings/mine — Get authenticated user's upcoming bookings
router.get('/mine', bookingController.getMyBookings);

export default router;
