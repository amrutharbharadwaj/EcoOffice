import { body } from 'express-validator';

/**
 * Validation chains for POST /api/v1/auth/register
 */
export const registerValidation = [
  body('email')
    .exists({ values: 'falsy' })
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 254 })
    .withMessage('Email must not exceed 254 characters')
    .normalizeEmail(),

  body('name')
    .exists({ values: 'falsy' })
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),

  body('password')
    .exists({ values: 'falsy' })
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
];

/**
 * Validation chains for POST /api/v1/auth/login
 */
export const loginValidation = [
  body('email')
    .exists({ values: 'falsy' })
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),

  body('password')
    .exists({ values: 'falsy' })
    .withMessage('Password is required'),
];
