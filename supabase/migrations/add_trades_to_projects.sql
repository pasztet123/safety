-- Add trades array to projects table (same pattern as safety_topics and checklists)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trades TEXT[] DEFAULT '{}';
