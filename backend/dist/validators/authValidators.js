"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginValidation = exports.registerValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validation chains for POST /api/v1/auth/register
 */
exports.registerValidation = [
    (0, express_validator_1.body)('email')
        .exists({ values: 'falsy' })
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .isLength({ max: 254 })
        .withMessage('Email must not exceed 254 characters')
        .normalizeEmail(),
    (0, express_validator_1.body)('name')
        .exists({ values: 'falsy' })
        .withMessage('Name is required')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters'),
    (0, express_validator_1.body)('password')
        .exists({ values: 'falsy' })
        .withMessage('Password is required')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters'),
];
/**
 * Validation chains for POST /api/v1/auth/login
 */
exports.loginValidation = [
    (0, express_validator_1.body)('email')
        .exists({ values: 'falsy' })
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format'),
    (0, express_validator_1.body)('password')
        .exists({ values: 'falsy' })
        .withMessage('Password is required'),
];
//# sourceMappingURL=authValidators.js.map