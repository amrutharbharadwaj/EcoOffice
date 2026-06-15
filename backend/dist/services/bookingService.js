"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeskBooking = createDeskBooking;
exports.createParkingBooking = createParkingBooking;
exports.cancelBooking = cancelBooking;
exports.getDeskAvailability = getDeskAvailability;
exports.getParkingAvailability = getParkingAvailability;
exports.getBookingOverview = getBookingOverview;
exports.getUserBookings = getUserBookings;
const pool_1 = __importDefault(require("../db/pool"));
/**
 * Creates a custom error with an HTTP status code.
 */
function createError(message, statusCode) {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
}
/**
 * Validates that a booking date is not in the past and not more than 30 days in the future.
 * Compares using UTC dates to avoid timezone issues.
 */
function validateBookingDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
        throw createError('Booking date cannot be in the past', 400);
    }
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);
    if (bookingDate > maxDate) {
        throw createError('Booking date cannot be more than 30 days in the future', 400);
    }
}
/**
 * Books a desk for a specific date.
 * Validates the date, checks the desk exists and is active, then inserts the booking.
 * Handles unique constraint violations (double-booking) with a 409 Conflict.
 */
async function createDeskBooking(userId, deskId, date) {
    validateBookingDate(date);
    // Check desk exists and is active
    const deskResult = await pool_1.default.query(`SELECT id, identifier, is_active FROM desks WHERE id = $1`, [deskId]);
    if (deskResult.rows.length === 0 || !deskResult.rows[0].is_active) {
        throw createError('Desk not found', 404);
    }
    try {
        const result = await pool_1.default.query(`INSERT INTO bookings (user_id, resource_type, resource_id, booking_date)
       VALUES ($1, 'desk', $2, $3)
       RETURNING id, user_id, resource_type, resource_id, booking_date, created_at, updated_at`, [userId, deskId, date]);
        return { booking: result.rows[0] };
    }
    catch (err) {
        if (err.code === '23505') {
            throw createError('Desk is already booked for this date', 409);
        }
        throw err;
    }
}
/**
 * Books a parking spot for a specific date.
 * Validates the date, checks the parking spot exists and is active, then inserts the booking.
 * Handles unique constraint violations (double-booking) with a 409 Conflict.
 */
async function createParkingBooking(userId, spotId, date) {
    validateBookingDate(date);
    // Check parking spot exists and is active
    const spotResult = await pool_1.default.query(`SELECT id, identifier, is_active FROM parking_spots WHERE id = $1`, [spotId]);
    if (spotResult.rows.length === 0 || !spotResult.rows[0].is_active) {
        throw createError('Parking spot not found', 404);
    }
    try {
        const result = await pool_1.default.query(`INSERT INTO bookings (user_id, resource_type, resource_id, booking_date)
       VALUES ($1, 'parking_spot', $2, $3)
       RETURNING id, user_id, resource_type, resource_id, booking_date, created_at, updated_at`, [userId, spotId, date]);
        return { booking: result.rows[0] };
    }
    catch (err) {
        if (err.code === '23505') {
            throw createError('Parking spot is already booked for this date', 409);
        }
        throw err;
    }
}
/**
 * Cancels a booking.
 * Verifies the booking exists, the user owns it, and the booking date is not in the past.
 */
async function cancelBooking(userId, bookingId) {
    // Fetch the booking
    const bookingResult = await pool_1.default.query(`SELECT id, user_id, booking_date FROM bookings WHERE id = $1`, [bookingId]);
    if (bookingResult.rows.length === 0) {
        throw createError('Booking not found', 404);
    }
    const booking = bookingResult.rows[0];
    // Check ownership
    if (booking.user_id !== userId) {
        throw createError('Access denied', 403);
    }
    // Check if booking date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(booking.booking_date);
    bookingDate.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
        throw createError('Cannot cancel past bookings', 400);
    }
    // Delete the booking
    await pool_1.default.query(`DELETE FROM bookings WHERE id = $1`, [bookingId]);
}
/**
 * Returns all active desks with their booking status for a given date.
 * Desks are ordered by floor then identifier.
 */
async function getDeskAvailability(date) {
    const result = await pool_1.default.query(`SELECT d.id, d.identifier, d.floor,
       CASE WHEN b.id IS NOT NULL THEN 'booked' ELSE 'available' END AS status
     FROM desks d
     LEFT JOIN bookings b ON b.resource_type = 'desk' AND b.resource_id = d.id AND b.booking_date = $1
     WHERE d.is_active = TRUE
     ORDER BY d.floor, d.identifier`, [date]);
    return result.rows;
}
/**
 * Returns all active parking spots with their booking status for a given date.
 * Parking spots are ordered by identifier.
 */
async function getParkingAvailability(date) {
    const result = await pool_1.default.query(`SELECT ps.id, ps.identifier, ps.location_label,
       CASE WHEN b.id IS NOT NULL THEN 'booked' ELSE 'available' END AS status
     FROM parking_spots ps
     LEFT JOIN bookings b ON b.resource_type = 'parking_spot' AND b.resource_id = ps.id AND b.booking_date = $1
     WHERE ps.is_active = TRUE
     ORDER BY ps.identifier`, [date]);
    return result.rows;
}
/**
 * Returns admin booking overview with optional date range and resource type filters.
 * Defaults to today → today + 30 days if no date range provided.
 * Validates date range ≤ 90 days.
 * Returns max 500 records sorted by booking_date ascending.
 */
async function getBookingOverview(filters) {
    const now = new Date();
    // Use UTC to avoid timezone issues
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    let startDate;
    let endDate;
    if (!filters.startDate && !filters.endDate) {
        // Default to today → today + 30 days
        const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 30));
        const endStr = `${defaultEnd.getUTCFullYear()}-${String(defaultEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(defaultEnd.getUTCDate()).padStart(2, '0')}`;
        startDate = todayStr;
        endDate = endStr;
    }
    else {
        startDate = filters.startDate;
        endDate = filters.endDate;
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            throw createError('Invalid date format. Use YYYY-MM-DD', 400);
        }
        // Validate the dates parse correctly
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw createError('Invalid date format. Use YYYY-MM-DD', 400);
        }
        // Validate range ≤ 90 days
        const diffMs = end.getTime() - start.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 90) {
            throw createError('Date range cannot exceed 90 days', 400);
        }
        if (diffDays < 0) {
            throw createError('End date must be after start date', 400);
        }
    }
    // Build query
    const params = [startDate, endDate];
    let resourceTypeClause = '';
    if (filters.resourceType) {
        resourceTypeClause = ' AND b.resource_type = $3';
        params.push(filters.resourceType);
    }
    const query = `
    SELECT b.id, b.booking_date, b.resource_type, b.resource_id,
      u.name AS user_name,
      CASE 
        WHEN b.resource_type = 'desk' THEN d.identifier
        WHEN b.resource_type = 'parking_spot' THEN ps.identifier
      END AS resource_identifier
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN desks d ON b.resource_type = 'desk' AND b.resource_id = d.id
    LEFT JOIN parking_spots ps ON b.resource_type = 'parking_spot' AND b.resource_id = ps.id
    WHERE b.booking_date >= $1 AND b.booking_date <= $2${resourceTypeClause}
    ORDER BY b.booking_date ASC
    LIMIT 500
  `;
    const result = await pool_1.default.query(query, params);
    const bookings = result.rows.map((row) => ({
        id: row.id,
        user_name: row.user_name,
        resource_type: row.resource_type,
        resource_identifier: row.resource_identifier,
        booking_date: row.booking_date,
    }));
    return {
        bookings,
        total: bookings.length,
    };
}
/**
 * Gets all upcoming bookings for a user (booking_date >= today).
 * Returns bookings sorted by booking_date ascending, with resource identifiers.
 */
async function getUserBookings(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await pool_1.default.query(`SELECT 
       b.id, b.user_id, b.resource_type, b.resource_id, b.booking_date, b.created_at, b.updated_at,
       CASE 
         WHEN b.resource_type = 'desk' THEN d.identifier
         WHEN b.resource_type = 'parking_spot' THEN ps.identifier
       END AS resource_identifier
     FROM bookings b
     LEFT JOIN desks d ON b.resource_type = 'desk' AND b.resource_id = d.id
     LEFT JOIN parking_spots ps ON b.resource_type = 'parking_spot' AND b.resource_id = ps.id
     WHERE b.user_id = $1 AND b.booking_date >= $2
     ORDER BY b.booking_date ASC`, [userId, today]);
    return result.rows;
}
//# sourceMappingURL=bookingService.js.map