ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS safety_violation_type TEXT;

ALTER TABLE incidents
DROP CONSTRAINT IF EXISTS incidents_safety_violation_type_check;

ALTER TABLE incidents
ADD CONSTRAINT incidents_safety_violation_type_check
CHECK (
  safety_violation_type IS NULL OR safety_violation_type IN (
    'PPE Violation',
    'Fall Protection Violation',
    'Ladder Safety Violation',
    'Scaffold Safety Violation',
    'Unsafe Use of Tools or Equipment',
    'Electrical Safety Violation',
    'Hazardous Material Handling Violation',
    'Failure to Follow Safety Procedures',
    'Improper Material Handling / Lifting',
    'Housekeeping Violation',
    'Vehical or Equipment Safety Violation',
    'Bypassing Safety Devices',
    'Unauthorized Work of Access',
    'Failure to Report Hazard or Incident',
    'Repeated Safety Violations'
  )
);

COMMENT ON COLUMN incidents.safety_violation_type IS 'Specific safety violation category used when type_name = ''Safety violation''';

CREATE INDEX IF NOT EXISTS idx_incidents_safety_violation_type
  ON incidents(safety_violation_type)
  WHERE safety_violation_type IS NOT NULL;

CREATE TABLE IF NOT EXISTS disciplinary_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  recipient_person_id UUID NOT NULL REFERENCES involved_persons(id) ON DELETE RESTRICT,
  responsible_leader_id UUID NOT NULL REFERENCES leaders(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'Verbal warning',
      'Retraining',
      'Written warning',
      'Suspension',
      'Termination'
    )
  ),
  action_notes TEXT,
  action_date DATE NOT NULL,
  action_time TIME NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_incident_id
  ON disciplinary_actions(incident_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_recipient_person_id
  ON disciplinary_actions(recipient_person_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_responsible_leader_id
  ON disciplinary_actions(responsible_leader_id);

CREATE INDEX IF NOT EXISTS idx_disciplinary_actions_action_date
  ON disciplinary_actions(action_date DESC, action_time DESC);

ALTER TABLE disciplinary_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view disciplinary actions" ON disciplinary_actions;
CREATE POLICY "Anyone can view disciplinary actions"
  ON disciplinary_actions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can insert disciplinary actions" ON disciplinary_actions;
CREATE POLICY "Anyone can insert disciplinary actions"
  ON disciplinary_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can update disciplinary actions" ON disciplinary_actions;
CREATE POLICY "Only admins can update disciplinary actions"
  ON disciplinary_actions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Only admins can delete disciplinary actions" ON disciplinary_actions;
CREATE POLICY "Only admins can delete disciplinary actions"
  ON disciplinary_actions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

CREATE OR REPLACE FUNCTION update_disciplinary_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS disciplinary_actions_updated_at ON disciplinary_actions;
CREATE TRIGGER disciplinary_actions_updated_at
  BEFORE UPDATE ON disciplinary_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_disciplinary_actions_updated_at();