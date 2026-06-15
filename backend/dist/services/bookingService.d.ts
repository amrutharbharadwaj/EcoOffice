export interface BookingRecord {
    id: number;
    user_id: number;
    resource_type: 'desk' | 'parking_spot';
    resource_id: number;
    booking_date: string;
    created_at: Date;
    updated_at: Date;
}
export interface UserBooking extends BookingRecord {
    resource_identifier: string;
}
/**
 * Books a desk for a specific date.
 * Validates the date, checks the desk exists and is active, then inserts the booking.
 * Handles unique constraint violations (double-booking) with a 409 Conflict.
 */
export declare function createDeskBooking(userId: number, deskId: number, date: Date): Promise<{
    booking: BookingRecord;
}>;
/**
 * Books a parking spot for a specific date.
 * Validates the date, checks the parking spot exists and is active, then inserts the booking.
 * Handles unique constraint violations (double-booking) with a 409 Conflict.
 */
export declare function createParkingBooking(userId: number, spotId: number, date: Date): Promise<{
    booking: BookingRecord;
}>;
/**
 * Cancels a booking.
 * Verifies the booking exists, the user owns it, and the booking date is not in the past.
 */
export declare function cancelBooking(userId: number, bookingId: number): Promise<void>;
export interface DeskAvailability {
    id: number;
    identifier: string;
    floor: number;
    status: 'available' | 'booked';
}
export interface ParkingAvailability {
    id: number;
    identifier: string;
    location_label: string;
    status: 'available' | 'booked';
}
/**
 * Returns all active desks with their booking status for a given date.
 * Desks are ordered by floor then identifier.
 */
export declare function getDeskAvailability(date: string): Promise<DeskAvailability[]>;
/**
 * Returns all active parking spots with their booking status for a given date.
 * Parking spots are ordered by identifier.
 */
export declare function getParkingAvailability(date: string): Promise<ParkingAvailability[]>;
export interface BookingOverviewFilters {
    startDate?: string;
    endDate?: string;
    resourceType?: 'desk' | 'parking_spot';
}
export interface BookingOverviewItem {
    id: number;
    user_name: string;
    resource_type: 'desk' | 'parking_spot';
    resource_identifier: string;
    booking_date: string;
}
export interface BookingOverviewResult {
    bookings: BookingOverviewItem[];
    total: number;
}
/**
 * Returns admin booking overview with optional date range and resource type filters.
 * Defaults to today → today + 30 days if no date range provided.
 * Validates date range ≤ 90 days.
 * Returns max 500 records sorted by booking_date ascending.
 */
export declare function getBookingOverview(filters: BookingOverviewFilters): Promise<BookingOverviewResult>;
/**
 * Gets all upcoming bookings for a user (booking_date >= today).
 * Returns bookings sorted by booking_date ascending, with resource identifiers.
 */
export declare function getUserBookings(userId: number): Promise<UserBooking[]>;
//# sourceMappingURL=bookingService.d.ts.map