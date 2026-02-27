-- Add predefined incident types
INSERT INTO incident_types (name) VALUES
  ('Accident (injury)'),
  ('Near miss'),
  ('Property damage'),
  ('Unsafe condition'),
  ('Unsafe act')
ON CONFLICT (name) DO NOTHING;
