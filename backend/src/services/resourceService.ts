import pool from '../db/pool';

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
 * Creates a custom error with an HTTP status code.
 */
function createError(message: string, statusCode: number): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

/**
 * Creates a new desk with the given identifier and floor number.
 * Throws 409 if a desk with the same identifier already exists.
 */
export async function addDesk(identifier: string, floor: number): Promise<{ desk: DeskRecord }> {
  try {
    const result = await pool.query(
      `INSERT INTO desks (identifier, floor)
       VALUES ($1, $2)
       RETURNING id, identifier, floor, is_active, created_at, updated_at`,
      [identifier, floor]
    );

    return { desk: result.rows[0] };
  } catch (err: any) {
    if (err.code === '23505') {
      throw createError('Identifier already in use', 409);
    }
    throw err;
  }
}

/**
 * Updates an existing desk's fields (identifier, floor).
 * Throws 404 if the desk does not exist or is inactive.
 * Throws 409 if the updated identifier conflicts with an existing one.
 */
export async function updateDesk(
  deskId: number,
  data: { identifier?: string; floor?: number }
): Promise<{ desk: DeskRecord }> {
  // Check desk exists and is active
  const existing = await pool.query(
    `SELECT id FROM desks WHERE id = $1 AND is_active = TRUE`,
    [deskId]
  );

  if (existing.rows.length === 0) {
    throw createError('Desk not found', 404);
  }

  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.identifier !== undefined) {
    setClauses.push(`identifier = $${paramIndex}`);
    values.push(data.identifier);
    paramIndex++;
  }

  if (data.floor !== undefined) {
    setClauses.push(`floor = $${paramIndex}`);
    values.push(data.floor);
    paramIndex++;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(deskId);

  try {
    const result = await pool.query(
      `UPDATE desks SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, identifier, floor, is_active, created_at, updated_at`,
      values
    );

    return { desk: result.rows[0] };
  } catch (err: any) {
    if (err.code === '23505') {
      throw createError('Identifier already in use', 409);
    }
    throw err;
  }
}

/**
 * Soft-deletes a desk by setting is_active = false.
 * Throws 404 if the desk does not exist or is already inactive.
 * Throws 409 if the desk has active bookings (booking_date >= today).
 */
export async function deactivateDesk(deskId: number): Promise<void> {
  // Check desk exists and is active
  const existing = await pool.query(
    `SELECT id FROM desks WHERE id = $1 AND is_active = TRUE`,
    [deskId]
  );

  if (existing.rows.length === 0) {
    throw createError('Desk not found', 404);
  }

  // Check for active bookings
  const activeBookings = await pool.query(
    `SELECT id FROM bookings
     WHERE resource_type = 'desk' AND resource_id = $1 AND booking_date >= CURRENT_DATE
     LIMIT 1`,
    [deskId]
  );

  if (activeBookings.rows.length > 0) {
    throw createError('Resource has active bookings', 409);
  }

  await pool.query(
    `UPDATE desks SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
    [deskId]
  );
}

/**
 * Creates a new parking spot with the given identifier and location label.
 * Throws 409 if a parking spot with the same identifier already exists.
 */
export async function addParkingSpot(
  identifier: string,
  locationLabel: string
): Promise<{ spot: ParkingSpotRecord }> {
  try {
    const result = await pool.query(
      `INSERT INTO parking_spots (identifier, location_label)
       VALUES ($1, $2)
       RETURNING id, identifier, location_label, is_active, created_at, updated_at`,
      [identifier, locationLabel]
    );

    return { spot: result.rows[0] };
  } catch (err: any) {
    if (err.code === '23505') {
      throw createError('Identifier already in use', 409);
    }
    throw err;
  }
}

/**
 * Updates an existing parking spot's fields (identifier, location_label).
 * Throws 404 if the parking spot does not exist or is inactive.
 * Throws 409 if the updated identifier conflicts with an existing one.
 */
export async function updateParkingSpot(
  spotId: number,
  data: { identifier?: string; locationLabel?: string }
): Promise<{ spot: ParkingSpotRecord }> {
  // Check spot exists and is active
  const existing = await pool.query(
    `SELECT id FROM parking_spots WHERE id = $1 AND is_active = TRUE`,
    [spotId]
  );

  if (existing.rows.length === 0) {
    throw createError('Parking spot not found', 404);
  }

  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.identifier !== undefined) {
    setClauses.push(`identifier = $${paramIndex}`);
    values.push(data.identifier);
    paramIndex++;
  }

  if (data.locationLabel !== undefined) {
    setClauses.push(`location_label = $${paramIndex}`);
    values.push(data.locationLabel);
    paramIndex++;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(spotId);

  try {
    const result = await pool.query(
      `UPDATE parking_spots SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, identifier, location_label, is_active, created_at, updated_at`,
      values
    );

    return { spot: result.rows[0] };
  } catch (err: any) {
    if (err.code === '23505') {
      throw createError('Identifier already in use', 409);
    }
    throw err;
  }
}

/**
 * Soft-deletes a parking spot by setting is_active = false.
 * Throws 404 if the parking spot does not exist or is already inactive.
 * Throws 409 if the parking spot has active bookings (booking_date >= today).
 */
export async function deactivateParkingSpot(spotId: number): Promise<void> {
  // Check spot exists and is active
  const existing = await pool.query(
    `SELECT id FROM parking_spots WHERE id = $1 AND is_active = TRUE`,
    [spotId]
  );

  if (existing.rows.length === 0) {
    throw createError('Parking spot not found', 404);
  }

  // Check for active bookings
  const activeBookings = await pool.query(
    `SELECT id FROM bookings
     WHERE resource_type = 'parking_spot' AND resource_id = $1 AND booking_date >= CURRENT_DATE
     LIMIT 1`,
    [spotId]
  );

  if (activeBookings.rows.length > 0) {
    throw createError('Resource has active bookings', 409);
  }

  await pool.query(
    `UPDATE parking_spots SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
    [spotId]
  );
}
