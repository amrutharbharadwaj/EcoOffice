import { body } from 'express-validator';

/**
 * Validation chains for POST /api/v1/bookings/desks
 */
export const deskBookingValidation = [
  body('deskId')
    .exists({ values: 'falsy' })
    .withMessage('deskId is required')
    .isInt()
    .withMessage('deskId must be an integer'),

  body('date')
    .exists({ values: 'falsy' })
    .withMessage('date is required')
    .isISO8601({ strict: true })
    .withMessage('date must be a valid YYYY-MM-DD format'),
];

/**
 * Validation chains for POST /api/v1/bookings/parking
 */
export const parkingBookingValidation = [
  body('parkingSpotId')
    .exists({ values: 'falsy' })
    .withMessage('parkingSpotId is required')
    .isInt()
    .withMessage('parkingSpotId must be an integer'),

  body('date')
    .exists({ values: 'falsy' })
    .withMessage('date is required')
    .isISO8601({ strict: true })
    .withMessage('date must be a valid YYYY-MM-DD format'),
];
