-- Migration: Create parking_spots table
-- Requirements: 12.3

CREATE TABLE IF NOT EXISTS parking_spots (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(50) UNIQUE NOT NULL,
    location_label VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parking_spots_active ON parking_spots(is_active) WHERE is_active = TRUE;
