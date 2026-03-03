-- Add GPS coordinates to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS longitude NUMERIC;
