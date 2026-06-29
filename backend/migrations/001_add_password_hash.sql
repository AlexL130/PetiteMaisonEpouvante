-- Migration: Add password_hash column to users table
-- Run this on existing databases that don't have the column yet

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Make email unique if not already (for new auth system)
-- This might fail if there are duplicates, handle manually if needed
-- ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
