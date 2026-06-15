"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookDesk = bookDesk;
exports.bookParking = bookParking;
exports.cancelBooking = cancelBooking;
exports.getMyBookings = getMyBookings;
const express_validator_1 = require("express-validator");
const bookingService = __importStar(require("../services/bookingService"));
/**
 * Maps express-validator errors to the standard error response format.
 */
function formatValidationErrors(errors) {
    const fieldErrors = errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
    }));
    return {
        error: 'Validation failed',
        fields: fieldErrors,
    };
}
/**
 * POST /api/v1/bookings/desks
 * Books a desk for a specific date.
 * Returns 201 on success, 400 on validation error, 404 if desk not found, 409 on conflict.
 */
async function bookDesk(req, res, next) {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json(formatValidationErrors(errors));
            return;
        }
        const { deskId, date } = req.body;
        const result = await bookingService.createDeskBooking(req.user.id, deskId, new Date(date));
        res.status(201).json({ data: result });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
/**
 * POST /api/v1/bookings/parking
 * Books a parking spot for a specific date.
 * Returns 201 on success, 400 on validation error, 404 if spot not found, 409 on conflict.
 */
async function bookParking(req, res, next) {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json(formatValidationErrors(errors));
            return;
        }
        const { parkingSpotId, date } = req.body;
        const result = await bookingService.createParkingBooking(req.user.id, parkingSpotId, new Date(date));
        res.status(201).json({ data: result });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
/**
 * DELETE /api/v1/bookings/:id
 * Cancels a booking owned by the authenticated user.
 * Returns 200 on success, 403 if not owner, 404 if not found.
 */
async function cancelBooking(req, res, next) {
    try {
        const bookingId = parseInt(req.params.id, 10);
        if (isNaN(bookingId)) {
            res.status(400).json({ error: 'Invalid booking ID' });
            return;
        }
        await bookingService.cancelBooking(req.user.id, bookingId);
        res.status(200).json({ data: { message: 'Booking cancelled successfully' } });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
/**
 * GET /api/v1/bookings/mine
 * Returns all upcoming bookings for the authenticated user.
 * Response includes resource_type, resource_identifier, and booking_date for each booking.
 * When no upcoming bookings exist, returns an empty array with an informational message.
 */
async function getMyBookings(req, res, next) {
    try {
        const bookings = await bookingService.getUserBookings(req.user.id);
        const formattedBookings = bookings.map((b) => ({
            id: b.id,
            resource_type: b.resource_type,
            resource_identifier: b.resource_identifier,
            booking_date: b.booking_date,
        }));
        if (formattedBookings.length === 0) {
            res.status(200).json({
                data: {
                    bookings: [],
                    message: 'No upcoming bookings found',
                },
            });
            return;
        }
        res.status(200).json({
            data: {
                bookings: formattedBookings,
            },
        });
    }
    catch (err) {
        if (isAppError(err) && err.statusCode) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        next(err);
    }
}
function isAppError(err) {
    return err instanceof Error && 'statusCode' in err;
}
//# sourceMappingURL=bookingController.js.map