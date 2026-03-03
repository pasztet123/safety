-- Create incident_witnesses table
CREATE TABLE IF NOT EXISTS incident_witnesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  person_id UUID REFERENCES involved_persons(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_witnesses_incident_id ON incident_witnesses(incident_id);

-- Enable RLS
ALTER TABLE incident_witnesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON incident_witnesses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
