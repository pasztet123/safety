-- Add trades array column to safety_topics (mirrors checklists.trades)
ALTER TABLE safety_topics ADD COLUMN IF NOT EXISTS trades TEXT[] DEFAULT '{}';
