-- Create safety_topics table
CREATE TABLE IF NOT EXISTS safety_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  osha_reference TEXT,
  description TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_safety_topics_category ON safety_topics(category);
CREATE INDEX idx_safety_topics_risk_level ON safety_topics(risk_level);

-- Enable RLS
ALTER TABLE safety_topics ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view topics
CREATE POLICY "Anyone can view safety topics"
  ON safety_topics
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert topics
CREATE POLICY "Authenticated users can create safety topics"
  ON safety_topics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only admins can update topics
CREATE POLICY "Only admins can update safety topics"
  ON safety_topics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Policy: Only admins can delete topics
CREATE POLICY "Only admins can delete safety topics"
  ON safety_topics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Add some default topics
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level) VALUES
  ('Fall Protection', 'Personal Protective Equipment', '1926.503', 'Training on fall protection systems, guardrails, safety nets, and personal fall arrest systems', 'high'),
  ('Scaffolding Safety', 'Work Platforms', '1926.451', 'Safe use and inspection of scaffolds, including supported and suspension scaffolds', 'high'),
  ('Ladder Safety', 'Access Equipment', '1926.1053', 'Proper selection, use, and inspection of ladders', 'medium'),
  ('Electrical Safety', 'Electrical Hazards', '1926.416', 'General electrical safety requirements and hazard recognition', 'critical'),
  ('Lockout/Tagout', 'Energy Control', '1926.417', 'Control of hazardous energy sources', 'critical'),
  ('Personal Protective Equipment (PPE)', 'Safety Equipment', '1926.95', 'Selection, use, and maintenance of PPE including hard hats, safety glasses, and gloves', 'medium'),
  ('Excavation and Trenching', 'Earthwork', '1926.651', 'Safe excavation practices, soil classification, and protective systems', 'high'),
  ('Confined Space Entry', 'Atmospheric Hazards', '1926.1203', 'Permit-required confined space entry procedures', 'critical'),
  ('Hazard Communication', 'Chemical Safety', '1926.59', 'Understanding SDS, chemical labeling, and hazardous materials handling', 'high'),
  ('Fire Prevention', 'Fire Safety', '1926.150', 'Fire prevention, fire protection equipment, and emergency procedures', 'high'),
  ('Crane and Rigging Safety', 'Heavy Equipment', '1926.1400', 'Safe operation of cranes and rigging equipment', 'critical'),
  ('Forklift Safety', 'Powered Industrial Vehicles', '1926.602', 'Safe operation and inspection of forklifts', 'high'),
  ('Respiratory Protection', 'Respiratory Hazards', '1926.103', 'Selection and use of respirators', 'high'),
  ('Heat Stress Prevention', 'Environmental Hazards', NULL, 'Recognition and prevention of heat-related illnesses', 'medium'),
  ('Cold Stress Prevention', 'Environmental Hazards', NULL, 'Recognition and prevention of cold-related illnesses', 'medium'),
  ('Hand and Power Tools', 'Tools and Equipment', '1926.300', 'Safe use and maintenance of hand and power tools', 'medium'),
  ('Stairways', 'Access and Egress', '1926.1052', 'Requirements for temporary and permanent stairways', 'medium'),
  ('Hearing Conservation', 'Noise Hazards', '1926.52', 'Protection from occupational noise exposure', 'medium'),
  ('Bloodborne Pathogens', 'Biological Hazards', '1910.1030', 'Protection from exposure to bloodborne pathogens', 'high'),
  ('Emergency Action Plan', 'Emergency Preparedness', '1926.35', 'Emergency evacuation procedures and assembly points', 'high');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_safety_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER safety_topics_updated_at
  BEFORE UPDATE ON safety_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_topics_updated_at();
