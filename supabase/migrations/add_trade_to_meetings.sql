-- Add trade column to meetings table
-- This allows recording the trade associated with a safety meeting,
-- which influences topic suggestion ordering in the meeting form UI.

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS trade text;
