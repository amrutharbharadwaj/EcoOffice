"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parkingBookingValidation = exports.deskBookingValidation = void 0;
const express_validator_1 = require("express-validator");
/**
 * Validation chains for POST /api/v1/bookings/desks
 */
exports.deskBookingValidation = [
    (0, express_validator_1.body)('deskId')
        .exists({ values: 'falsy' })
        .withMessage('deskId is required')
        .isInt()
        .withMessage('deskId must be an integer'),
    (0, express_validator_1.body)('date')
        .exists({ values: 'falsy' })
        .withMessage('date is required')
        .isISO8601({ strict: true })
        .withMessage('date must be a valid YYYY-MM-DD format'),
];
/**
 * Validation chains for POST /api/v1/bookings/parking
 */
exports.parkingBookingValidation = [
    (0, express_validator_1.body)('parkingSpotId')
        .exists({ values: 'falsy' })
        .withMessage('parkingSpotId is required')
        .isInt()
        .withMessage('parkingSpotId must be an integer'),
    (0, express_validator_1.body)('date')
        .exists({ values: 'falsy' })
        .withMessage('date is required')
        .isISO8601({ strict: true })
        .withMessage('date must be a valid YYYY-MM-DD format'),
];
//# sourceMappingURL=bookingValidators.js.map