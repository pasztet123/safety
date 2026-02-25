-- Remove created_at and updated_at columns from meetings table
ALTER TABLE meetings 
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;
