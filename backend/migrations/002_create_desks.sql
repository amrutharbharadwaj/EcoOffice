-- Migration: Create desks table
-- Requirements: 12.2

CREATE TABLE IF NOT EXISTS desks (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(50) UNIQUE NOT NULL,
    floor INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_desks_active ON desks(is_active) WHERE is_active = TRUE;
