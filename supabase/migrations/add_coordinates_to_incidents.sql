-- Add GPS coordinates to incidents table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS longitude NUMERIC;
