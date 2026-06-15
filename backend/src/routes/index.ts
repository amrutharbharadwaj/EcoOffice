import { Router } from 'express';
import authRouter from './auth';
import bookingsRouter from './bookings';
import availabilityRouter from './availability';
import adminRouter from './admin';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes — /api/v1/auth/*
router.use('/auth', authRouter);

// Booking routes — /api/v1/bookings/*
router.use('/bookings', bookingsRouter);

// Availability routes — /api/v1/availability/*
router.use('/availability', availabilityRouter);

// Admin routes — /api/v1/admin/*
router.use('/admin', adminRouter);

export default router;
