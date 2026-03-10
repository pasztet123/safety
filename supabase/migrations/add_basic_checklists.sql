-- =============================================================================
-- Create 15 foundational basic checklists.
--
-- These are the canonical short-form checklists (max 15 items each).
-- Items are populated in the next migration step.
--
-- Category uses the 12 canonical hazard-type categories from categories.js.
-- Trade names must match the canonical trades table exactly.
-- Idempotent — skips any checklist that already exists by name.
-- =============================================================================


-- 1. Daily Jobsite Safety — Start of Day
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Daily Jobsite Safety — Start of Day',
  'General / Jobsite Safety',
  'Pre-work morning check covering site access, emergency exits, housekeeping, PPE, and immediate hazards. Required before any crew starts work.',
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
    'HVAC','Electrical','General Labor'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Daily Jobsite Safety — Start of Day'
);


-- 2. End-of-Day Site Walkthrough
INSERT INTO checklists (name, category, description, trades)
SELECT
  'End-of-Day Site Walkthrough',
  'General / Jobsite Safety',
  'End-of-shift review to secure the site, remove hazards, verify tool storage, and confirm the site is safe for overnight and next-day conditions.',
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
    'HVAC','Electrical','General Labor'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'End-of-Day Site Walkthrough'
);


-- 3. Fall Protection Setup — Pre-Work Verification
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Fall Protection Setup — Pre-Work Verification',
  'Fall & Height Hazards',
  'Verify fall protection is properly installed and inspected before any work at height begins. Covers harnesses, anchors, guardrails, and warning lines.',
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Fall Protection Setup — Pre-Work Verification'
);


-- 4. Ladder Pre-Use Inspection
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Ladder Pre-Use Inspection',
  'Fall & Height Hazards',
  'Quick pre-use check of ladder condition, setup angle, foot stability, top securing, and duty rating before climbing.',
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Insulation','HVAC','Electrical'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Ladder Pre-Use Inspection'
);


-- 5. Scaffold Setup & Daily Inspection
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Scaffold Setup & Daily Inspection',
  'Fall & Height Hazards',
  'Daily scaffold safety check covering base plates, mud sills, bracing, planking integrity, guardrails, and load capacity compliance.',
  ARRAY[
    'Roofing','Siding','Masonry','Carpentry / Framing',
    'Sheet Metal / Flashing','Scaffolding'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Scaffold Setup & Daily Inspection'
);


-- 6. Torch-Down & Hot Work Safety Check
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Torch-Down & Hot Work Safety Check',
  'Fire & Hot Work',
  'Pre-work safety check for torch-applied roofing: cylinder condition, 30-ft clearance, fire extinguisher placement, fire watch assignment, and post-work smolder check.',
  ARRAY['Roofing','Sheet Metal / Flashing']
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Torch-Down & Hot Work Safety Check'
);


-- 7. PPE Compliance Verification
INSERT INTO checklists (name, category, description, trades)
SELECT
  'PPE Compliance Verification',
  'General / Jobsite Safety',
  'Confirm all workers have and are wearing the correct PPE for their assigned tasks. Covers hard hats, eye protection, gloves, footwear, and high-visibility gear.',
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
    'HVAC','Electrical','General Labor'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'PPE Compliance Verification'
);


-- 8. Power Tool Pre-Use Inspection
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Power Tool Pre-Use Inspection',
  'Tools & Equipment Safety',
  'Pre-shift check of all power tools: guards in place, cord and battery condition, trigger function, and correct PPE matched to tool class.',
  ARRAY[
    'Roofing','Siding','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Insulation','HVAC','Electrical'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Power Tool Pre-Use Inspection'
);


-- 9. Nail Gun Pre-Use Safety Inspection
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Nail Gun Pre-Use Safety Inspection',
  'Tools & Equipment Safety',
  'Pre-use inspection covering trigger type (sequential vs contact), contact tip condition, hose/battery connections, air pressure setting, and correct fastener loading.',
  ARRAY['Roofing','Siding','Carpentry / Framing','Sheet Metal / Flashing']
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Nail Gun Pre-Use Safety Inspection'
);


-- 10. Weather & Wind Hazard Assessment
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Weather & Wind Hazard Assessment',
  'Weather & Environmental',
  'Pre-work assessment of current and forecast conditions. Covers wind speed limits for elevated work, lightning risk, heat/cold stress thresholds, and go/no-go decision.',
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing',
    'Masonry','Scaffolding','Insulation'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Weather & Wind Hazard Assessment'
);


-- 11. Material Delivery & Staging Safety
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Material Delivery & Staging Safety',
  'Material Handling & Struck-By',
  'Verify safe delivery zone setup, drop/staging area clearance, load stability on roof or ground, and worker positioning during material offload.',
  ARRAY[
    'Roofing','Siding','Masonry','Carpentry / Framing',
    'Sheet Metal / Flashing','Gutters'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Material Delivery & Staging Safety'
);


-- 12. Emergency Preparedness & First Aid Check
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Emergency Preparedness & First Aid Check',
  'Medical & Emergency Response',
  'Verify first aid kit is fully stocked, nearest hospital route is designated, emergency contacts are posted at the site, and the crew has been briefed on the evacuation plan.',
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
    'HVAC','Electrical','General Labor'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Emergency Preparedness & First Aid Check'
);


-- 13. Silica & Respiratory Hazard Control
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Silica & Respiratory Hazard Control',
  'Chemical & Biological Hazards',
  'Pre-task checklist for any cutting, grinding, or drilling of masonry, concrete, or fiber cement. Covers wet cutting setup, LEV, respirator fit, and Table 1 compliance.',
  ARRAY['Masonry','Roofing','Siding','Carpentry / Framing']
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Silica & Respiratory Hazard Control'
);


-- 14. Electrical Safety & LOTO Verification
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Electrical Safety & LOTO Verification',
  'Electrical Hazards',
  'Before any work on or near electrical systems: verify LOTO is applied, circuits are verified de-energized, GFCIs are tested, and overhead power lines are identified and marked.',
  ARRAY['Electrical','HVAC','General Labor','Carpentry / Framing']
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Electrical Safety & LOTO Verification'
);


-- 15. Post-Incident Review & Corrective Actions
INSERT INTO checklists (name, category, description, trades)
SELECT
  'Post-Incident Review & Corrective Actions',
  'Regulatory & Compliance',
  'Structured review after any injury, near-miss, or property damage event. Covers scene documentation, root cause identification, corrective action assignment, and follow-up verification.',
  ARRAY[
    'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
    'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
    'HVAC','Electrical','General Labor'
  ]
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Post-Incident Review & Corrective Actions'
);
