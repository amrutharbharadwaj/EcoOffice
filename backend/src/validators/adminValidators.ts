import { body } from 'express-validator';

/**
 * Validation chains for POST /api/v1/admin/desks
 * identifier: required, 1–50 chars
 * floor: required, integer
 */
export const createDeskValidation = [
  body('identifier')
    .exists({ values: 'falsy' })
    .withMessage('identifier is required')
    .isString()
    .withMessage('identifier must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('identifier must be between 1 and 50 characters'),

  body('floor')
    .exists({ values: 'falsy' })
    .withMessage('floor is required')
    .isInt()
    .withMessage('floor must be an integer'),
];

/**
 * Validation chains for PUT /api/v1/admin/desks/:id
 * identifier: optional, 1–50 chars
 * floor: optional, integer
 */
export const updateDeskValidation = [
  body('identifier')
    .optional()
    .isString()
    .withMessage('identifier must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('identifier must be between 1 and 50 characters'),

  body('floor')
    .optional()
    .isInt()
    .withMessage('floor must be an integer'),
];

/**
 * Validation chains for POST /api/v1/admin/parking
 * identifier: required, 1–50 chars
 * locationLabel: required, 1–100 chars
 */
export const createParkingValidation = [
  body('identifier')
    .exists({ values: 'falsy' })
    .withMessage('identifier is required')
    .isString()
    .withMessage('identifier must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('identifier must be between 1 and 50 characters'),

  body('locationLabel')
    .exists({ values: 'falsy' })
    .withMessage('locationLabel is required')
    .isString()
    .withMessage('locationLabel must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('locationLabel must be between 1 and 100 characters'),
];

/**
 * Validation chains for PUT /api/v1/admin/parking/:id
 * identifier: optional, 1–50 chars
 * locationLabel: optional, 1–100 chars
 */
export const updateParkingValidation = [
  body('identifier')
    .optional()
    .isString()
    .withMessage('identifier must be a string')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('identifier must be between 1 and 50 characters'),

  body('locationLabel')
    .optional()
    .isString()
    .withMessage('locationLabel must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('locationLabel must be between 1 and 100 characters'),
];
