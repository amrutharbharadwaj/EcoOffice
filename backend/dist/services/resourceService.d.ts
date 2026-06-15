export interface DeskRecord {
    id: number;
    identifier: string;
    floor: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface ParkingSpotRecord {
    id: number;
    identifier: string;
    location_label: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
/**
 * Creates a new desk with the given identifier and floor number.
 * Throws 409 if a desk with the same identifier already exists.
 */
export declare function addDesk(identifier: string, floor: number): Promise<{
    desk: DeskRecord;
}>;
/**
 * Updates an existing desk's fields (identifier, floor).
 * Throws 404 if the desk does not exist or is inactive.
 * Throws 409 if the updated identifier conflicts with an existing one.
 */
export declare function updateDesk(deskId: number, data: {
    identifier?: string;
    floor?: number;
}): Promise<{
    desk: DeskRecord;
}>;
/**
 * Soft-deletes a desk by setting is_active = false.
 * Throws 404 if the desk does not exist or is already inactive.
 * Throws 409 if the desk has active bookings (booking_date >= today).
 */
export declare function deactivateDesk(deskId: number): Promise<void>;
/**
 * Creates a new parking spot with the given identifier and location label.
 * Throws 409 if a parking spot with the same identifier already exists.
 */
export declare function addParkingSpot(identifier: string, locationLabel: string): Promise<{
    spot: ParkingSpotRecord;
}>;
/**
 * Updates an existing parking spot's fields (identifier, location_label).
 * Throws 404 if the parking spot does not exist or is inactive.
 * Throws 409 if the updated identifier conflicts with an existing one.
 */
export declare function updateParkingSpot(spotId: number, data: {
    identifier?: string;
    locationLabel?: string;
}): Promise<{
    spot: ParkingSpotRecord;
}>;
/**
 * Soft-deletes a parking spot by setting is_active = false.
 * Throws 404 if the parking spot does not exist or is already inactive.
 * Throws 409 if the parking spot has active bookings (booking_date >= today).
 */
export declare function deactivateParkingSpot(spotId: number): Promise<void>;
//# sourceMappingURL=resourceService.d.ts.map