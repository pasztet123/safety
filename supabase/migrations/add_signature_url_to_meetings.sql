-- Add leader signature URL to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS signature_url TEXT;
