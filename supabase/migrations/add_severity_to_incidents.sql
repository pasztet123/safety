-- Add severity field to incidents table
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low', 'recordable', 'lost_time', 'critical'));

-- Add anyone_injured boolean
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS anyone_injured BOOLEAN DEFAULT FALSE;

-- Add injury detail fields
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS body_part TEXT,
  ADD COLUMN IF NOT EXISTS medical_treatment TEXT CHECK (medical_treatment IN ('none', 'first_aid', 'medical', 'emergency')),
  ADD COLUMN IF NOT EXISTS hospitalized BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS days_away_from_work INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_property_cost NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS equipment_involved TEXT,
  ADD COLUMN IF NOT EXISTS immediate_cause TEXT,
  ADD COLUMN IF NOT EXISTS contributing_factors TEXT,
  ADD COLUMN IF NOT EXISTS osha_recordable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS root_cause TEXT,
  ADD COLUMN IF NOT EXISTS report_mode TEXT CHECK (report_mode IN ('quick', 'full')) DEFAULT 'full';
