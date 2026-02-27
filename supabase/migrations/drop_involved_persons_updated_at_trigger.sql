-- Drop the trigger that references the removed updated_at column
DROP TRIGGER IF EXISTS update_involved_persons_updated_at ON involved_persons;
