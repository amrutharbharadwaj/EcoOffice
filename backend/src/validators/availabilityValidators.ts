import { query } from 'express-validator';

/**
 * Validation chains for GET /api/v1/availability/desks and /parking
 * Validates the required date query parameter is in YYYY-MM-DD format.
 */
export const availabilityValidation = [
  query('date')
    .exists({ values: 'falsy' })
    .withMessage('Date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((value: string) => {
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) {
        throw new Error('Date must be a valid calendar date');
      }
      return true;
    }),
];
