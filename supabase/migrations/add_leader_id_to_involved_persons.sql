-- Add leader_id FK to involved_persons so a worker can be linked to a leader record
ALTER TABLE involved_persons
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES leaders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_involved_persons_leader_id ON involved_persons(leader_id);

-- Auto-link existing records by exact (case-insensitive) name match
UPDATE involved_persons ip
SET leader_id = l.id
FROM leaders l
WHERE LOWER(TRIM(ip.name)) = LOWER(TRIM(l.name))
  AND ip.leader_id IS NULL;
