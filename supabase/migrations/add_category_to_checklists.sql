-- Add category field to checklists table
ALTER TABLE checklists 
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_checklists_category ON checklists(category);
