-- Migration: Create bookings table
-- Requirements: 12.4, 12.5, 12.6

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('desk', 'parking_spot')),
    resource_id INTEGER NOT NULL,
    booking_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_resource_booking UNIQUE (resource_type, resource_id, booking_date)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_type, resource_id);
