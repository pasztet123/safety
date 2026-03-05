-- Add is_draft and import_batch_id columns to meetings for bulk-import draft functionality
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Index for fast admin draft queries
CREATE INDEX IF NOT EXISTS meetings_is_draft_idx ON meetings (is_draft) WHERE is_draft = true;

-- csv_imports table to track import history and enable duplicate detection
CREATE TABLE IF NOT EXISTS csv_imports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  imported_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  filename      TEXT,
  meeting_count INT NOT NULL DEFAULT 0
);
