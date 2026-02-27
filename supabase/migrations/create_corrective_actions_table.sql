-- Create predefined_corrective_actions table
CREATE TABLE IF NOT EXISTS predefined_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create corrective_actions table
CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  responsible_person_id UUID REFERENCES involved_persons(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_corrective_actions_incident_id ON corrective_actions(incident_id);
CREATE INDEX idx_corrective_actions_status ON corrective_actions(status);

-- Enable RLS
ALTER TABLE predefined_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

-- Predefined corrective actions policies
-- Everyone can read predefined actions
CREATE POLICY "Anyone can view predefined corrective actions"
  ON predefined_corrective_actions FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete predefined actions
CREATE POLICY "Only admins can insert predefined corrective actions"
  ON predefined_corrective_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM involved_persons
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update predefined corrective actions"
  ON predefined_corrective_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM involved_persons
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete predefined corrective actions"
  ON predefined_corrective_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM involved_persons
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Corrective actions policies
-- Everyone can view corrective actions
CREATE POLICY "Anyone can view corrective actions"
  ON corrective_actions FOR SELECT
  TO authenticated
  USING (true);

-- Anyone can insert corrective actions
CREATE POLICY "Anyone can insert corrective actions"
  ON corrective_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can update corrective actions
CREATE POLICY "Only admins can update corrective actions"
  ON corrective_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM involved_persons
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete corrective actions
CREATE POLICY "Only admins can delete corrective actions"
  ON corrective_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM involved_persons
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert predefined corrective actions
INSERT INTO predefined_corrective_actions (category, description) VALUES
  -- I. Engineering Controls
  ('Engineering Controls - Fall Protection', 'Install permanent guardrail system'),
  ('Engineering Controls - Fall Protection', 'Install temporary guardrails'),
  ('Engineering Controls - Fall Protection', 'Install toe boards'),
  ('Engineering Controls - Fall Protection', 'Install safety netting'),
  ('Engineering Controls - Fall Protection', 'Add anchor points for fall arrest systems'),
  ('Engineering Controls - Fall Protection', 'Repair damaged anchor points'),
  ('Engineering Controls - Fall Protection', 'Install edge protection'),
  ('Engineering Controls - Fall Protection', 'Secure roof hatch'),
  ('Engineering Controls - Fall Protection', 'Add warning lines around roof perimeter'),
  
  ('Engineering Controls - Ladder/Access Safety', 'Replace damaged ladder'),
  ('Engineering Controls - Ladder/Access Safety', 'Secure ladder at top and bottom'),
  ('Engineering Controls - Ladder/Access Safety', 'Install ladder stabilizer'),
  ('Engineering Controls - Ladder/Access Safety', 'Provide proper extension ladder length'),
  ('Engineering Controls - Ladder/Access Safety', 'Install fixed access ladder'),
  ('Engineering Controls - Ladder/Access Safety', 'Add anti-slip ladder feet'),
  
  ('Engineering Controls - Scaffold', 'Rebuild scaffold to OSHA specs'),
  ('Engineering Controls - Scaffold', 'Add midrails and guardrails'),
  ('Engineering Controls - Scaffold', 'Install proper base plates'),
  ('Engineering Controls - Scaffold', 'Level scaffold base'),
  ('Engineering Controls - Scaffold', 'Add scaffold tie-ins to structure'),
  
  ('Engineering Controls - Electrical', 'Replace damaged extension cord'),
  ('Engineering Controls - Electrical', 'Install GFCI protection'),
  ('Engineering Controls - Electrical', 'Secure exposed wiring'),
  ('Engineering Controls - Electrical', 'Install protective conduit'),
  ('Engineering Controls - Electrical', 'Lockout and tag faulty equipment'),
  ('Engineering Controls - Electrical', 'Replace damaged breaker'),
  
  ('Engineering Controls - Machinery/Tools', 'Install machine guard'),
  ('Engineering Controls - Machinery/Tools', 'Replace defective tool'),
  ('Engineering Controls - Machinery/Tools', 'Add emergency stop mechanism'),
  ('Engineering Controls - Machinery/Tools', 'Service malfunctioning equipment'),
  ('Engineering Controls - Machinery/Tools', 'Install blade guard'),
  ('Engineering Controls - Machinery/Tools', 'Replace worn-out components'),
  
  ('Engineering Controls - Housekeeping/Site Condition', 'Remove debris from walking path'),
  ('Engineering Controls - Housekeeping/Site Condition', 'Install non-slip mats'),
  ('Engineering Controls - Housekeeping/Site Condition', 'Improve drainage'),
  ('Engineering Controls - Housekeeping/Site Condition', 'Level uneven surface'),
  ('Engineering Controls - Housekeeping/Site Condition', 'Improve lighting in work area'),
  ('Engineering Controls - Housekeeping/Site Condition', 'Install additional lighting fixtures'),
  
  ('Engineering Controls - Traffic/Heavy Equipment', 'Install barricades'),
  ('Engineering Controls - Traffic/Heavy Equipment', 'Mark pedestrian walkways'),
  ('Engineering Controls - Traffic/Heavy Equipment', 'Add spotter requirement'),
  ('Engineering Controls - Traffic/Heavy Equipment', 'Install convex mirrors at blind corners'),
  ('Engineering Controls - Traffic/Heavy Equipment', 'Add wheel stops'),
  
  -- II. Administrative Controls
  ('Administrative Controls - Policy Updates', 'Update safety policy'),
  ('Administrative Controls - Policy Updates', 'Revise fall protection plan'),
  ('Administrative Controls - Policy Updates', 'Update JSA (Job Safety Analysis)'),
  ('Administrative Controls - Policy Updates', 'Implement new site safety rule'),
  ('Administrative Controls - Policy Updates', 'Update PPE requirements'),
  ('Administrative Controls - Policy Updates', 'Revise equipment inspection checklist'),
  
  ('Administrative Controls - Process Changes', 'Modify work sequence'),
  ('Administrative Controls - Process Changes', 'Introduce permit-to-work system'),
  ('Administrative Controls - Process Changes', 'Require pre-task safety briefing'),
  ('Administrative Controls - Process Changes', 'Introduce mandatory equipment inspection'),
  ('Administrative Controls - Process Changes', 'Add daily safety walk'),
  
  ('Administrative Controls - Training Related', 'Conduct toolbox meeting on specific hazard'),
  ('Administrative Controls - Training Related', 'Provide retraining for involved employee'),
  ('Administrative Controls - Training Related', 'Conduct site-wide safety training'),
  ('Administrative Controls - Training Related', 'Conduct specialized equipment training'),
  ('Administrative Controls - Training Related', 'Issue written safety reminder'),
  ('Administrative Controls - Training Related', 'Safety stand-down'),
  
  ('Administrative Controls - Supervision', 'Increase supervision in high-risk area'),
  ('Administrative Controls - Supervision', 'Assign dedicated safety monitor'),
  ('Administrative Controls - Supervision', 'Require foreman approval before task start'),
  
  -- III. PPE-related actions
  ('PPE-Related Actions', 'Provide cut-resistant gloves'),
  ('PPE-Related Actions', 'Provide fall protection harness'),
  ('PPE-Related Actions', 'Replace defective harness'),
  ('PPE-Related Actions', 'Provide face shields'),
  ('PPE-Related Actions', 'Provide safety goggles'),
  ('PPE-Related Actions', 'Provide hearing protection'),
  ('PPE-Related Actions', 'Provide high-visibility vests'),
  ('PPE-Related Actions', 'Enforce mandatory PPE use'),
  ('PPE-Related Actions', 'Replace worn-out PPE'),
  ('PPE-Related Actions', 'Introduce PPE inspection protocol'),
  
  -- IV. Behavioral/Disciplinary Actions
  ('Behavioral/Disciplinary Actions', 'Verbal warning'),
  ('Behavioral/Disciplinary Actions', 'Written warning'),
  ('Behavioral/Disciplinary Actions', 'Suspension from site'),
  ('Behavioral/Disciplinary Actions', 'Mandatory retraining'),
  ('Behavioral/Disciplinary Actions', 'Performance improvement plan'),
  ('Behavioral/Disciplinary Actions', 'Safety violation documentation'),
  ('Behavioral/Disciplinary Actions', 'Remove employee from high-risk task'),
  ('Behavioral/Disciplinary Actions', 'Safety coaching session'),
  
  -- V. Emergency/Immediate Response Actions
  ('Emergency/Immediate Response', 'Stop work immediately'),
  ('Emergency/Immediate Response', 'Isolate hazardous area'),
  ('Emergency/Immediate Response', 'Shut down equipment'),
  ('Emergency/Immediate Response', 'Provide first aid'),
  ('Emergency/Immediate Response', 'Call emergency services'),
  ('Emergency/Immediate Response', 'Evacuate area'),
  ('Emergency/Immediate Response', 'Notify safety manager'),
  ('Emergency/Immediate Response', 'Notify project manager'),
  
  -- VI. Corrective Actions for Near Miss
  ('Near Miss Specific', 'Conduct root cause analysis'),
  ('Near Miss Specific', 'Implement additional fall protection'),
  ('Near Miss Specific', 'Reinforce PPE compliance'),
  ('Near Miss Specific', 'Improve material storage'),
  ('Near Miss Specific', 'Secure loose tools'),
  ('Near Miss Specific', 'Install tool lanyards'),
  ('Near Miss Specific', 'Adjust workflow to reduce congestion'),
  ('Near Miss Specific', 'Increase housekeeping frequency'),
  
  -- VII. Root Cause Oriented Actions
  ('Root Cause - Human Error', 'Provide task-specific retraining'),
  ('Root Cause - Human Error', 'Implement buddy system'),
  ('Root Cause - Human Error', 'Simplify work procedure'),
  
  ('Root Cause - Equipment Failure', 'Replace equipment'),
  ('Root Cause - Equipment Failure', 'Implement preventive maintenance schedule'),
  ('Root Cause - Equipment Failure', 'Conduct equipment audit'),
  
  ('Root Cause - Lack of Training', 'Mandatory certification training'),
  ('Root Cause - Lack of Training', 'Supervisor training program'),
  ('Root Cause - Lack of Training', 'Onboarding improvement'),
  
  ('Root Cause - Communication Failure', 'Daily coordination meeting'),
  ('Root Cause - Communication Failure', 'Clear signage installation'),
  ('Root Cause - Communication Failure', 'Introduce radio communication protocol'),
  
  -- VIII. Environmental/Weather Related
  ('Environmental/Weather Related', 'Suspend work due to high wind'),
  ('Environmental/Weather Related', 'Implement heat stress protocol'),
  ('Environmental/Weather Related', 'Provide cooling station'),
  ('Environmental/Weather Related', 'Provide warming station'),
  ('Environmental/Weather Related', 'Adjust work schedule'),
  ('Environmental/Weather Related', 'Install weather monitoring device'),
  
  -- IX. Long-Term Preventive Actions
  ('Long-Term Preventive Actions', 'Implement safety audit program'),
  ('Long-Term Preventive Actions', 'Monthly safety performance review'),
  ('Long-Term Preventive Actions', 'Introduce near miss reporting incentive'),
  ('Long-Term Preventive Actions', 'Safety committee meeting'),
  ('Long-Term Preventive Actions', 'Safety KPI tracking implementation'),
  ('Long-Term Preventive Actions', 'Hire dedicated safety officer');
