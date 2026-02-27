-- Remove created_at and updated_at columns from safety_topics table

-- Drop the trigger first
DROP TRIGGER IF EXISTS safety_topics_updated_at ON safety_topics;

-- Drop the function
DROP FUNCTION IF EXISTS update_safety_topics_updated_at();

-- Remove the columns
ALTER TABLE safety_topics
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at;
