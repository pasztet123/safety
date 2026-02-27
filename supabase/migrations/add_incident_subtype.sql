-- Add incident_subtype column to incidents table
ALTER TABLE incidents
ADD COLUMN incident_subtype TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN incidents.incident_subtype IS 'Subtype of incident (e.g., laceration, fracture for injuries; slip, fall for near misses)';
