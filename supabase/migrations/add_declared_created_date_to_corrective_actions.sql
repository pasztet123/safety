ALTER TABLE corrective_actions
ADD COLUMN IF NOT EXISTS declared_created_date DATE;

UPDATE corrective_actions
SET declared_created_date = COALESCE(declared_created_date, created_at::date, CURRENT_DATE)
WHERE declared_created_date IS NULL;

ALTER TABLE corrective_actions
ALTER COLUMN declared_created_date SET DEFAULT CURRENT_DATE;