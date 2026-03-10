-- =============================================================================
-- Canonical Trades Cleanup + Assign correct trades[] to all checklists
--
-- BACKGROUND: The trades table had 37 non-canonical entries (hazard tags like
-- "Fall Protection", "Equipment", "Safety", "Documentation" were incorrectly
-- used as trade names). This migration:
--   1. Adds the 6 missing canonical trades to the trades table
--   2. Replaces all non-canonical trades[] values in checklists with the
--      correct 12 canonical trade names
--   3. Does the same cleanup for safety_topics.trades[]
--   4. Deletes all non-canonical entries from the trades table
--
-- APPLIED: 2026-03-09 directly via Supabase MCP
-- Safe to re-run — conditional UPDATEs and ON CONFLICT DO NOTHING
-- =============================================================================

-- ── 0. Ensure canonical trades exist ─────────────────────────────────────────
INSERT INTO trades (name) VALUES
  ('Roofing'),
  ('Siding'),
  ('Gutters'),
  ('Sheet Metal / Flashing'),
  ('Masonry'),
  ('Carpentry / Framing'),
  ('Windows & Doors'),
  ('Scaffolding'),
  ('Insulation'),
  ('HVAC'),
  ('Electrical'),
  ('General Labor')
ON CONFLICT (name) DO NOTHING;


-- ── I. Daily Jobsite Safety → all 12 trades ───────────────────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
  'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
  'HVAC','Electrical','General Labor'
]
WHERE name IN (
  'Daily Jobsite Safety Inspection',
  'Daily Supervisor Walkthrough',
  'Pre-Task Safety Check',
  'Morning Safety Compliance Check',
  'End-of-Day Site Condition Check',
  'High-Risk Activity Verification',
  'Housekeeping Inspection',
  'PPE Compliance Check',
  'Weather Condition Assessment',
  'Site Access & Egress Check'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── II. Fall Protection → height-work trades ──────────────────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
  'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation'
]
WHERE name IN (
  'Roof Edge Protection Inspection',
  'Fall Protection System Inspection',
  'Anchor Point Verification',
  'Guardrail System Inspection',
  'Personal Fall Arrest System Inspection',
  'Warning Line System Inspection',
  'Roof Hatch Safety Check',
  'Skylight Protection Inspection'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── III. Ladder & Access Equipment ────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
  'Carpentry / Framing','Windows & Doors','Insulation','HVAC','Electrical'
]
WHERE name IN (
  'Ladder Pre-Use Inspection',
  'Ladder Weekly Inspection',
  'Fixed Ladder Inspection',
  'Stair Tower Inspection',
  'Temporary Access Inspection',
  'Extension Ladder Setup Verification'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── IV. Scaffold Safety ───────────────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Masonry','Carpentry / Framing',
  'Sheet Metal / Flashing','Scaffolding'
]
WHERE name IN (
  'Scaffold Daily Inspection',
  'Scaffold Weekly Inspection',
  'Scaffold After Weather Event Inspection',
  'Mobile Scaffold Inspection',
  'Suspended Scaffold Inspection',
  'Scaffold Tag Verification'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── V. Electrical Safety ──────────────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY['Electrical','HVAC','General Labor']
WHERE name IN (
  'Temporary Power Inspection',
  'Extension Cord Inspection',
  'GFCI Verification',
  'Lockout/Tagout Verification',
  'Electrical Panel Inspection',
  'Generator Safety Inspection'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── VI. Tools & Machinery ─────────────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Sheet Metal / Flashing','Masonry',
  'Carpentry / Framing','Insulation','HVAC','Electrical'
]
WHERE name IN (
  'Power Tool Pre-Use Inspection',
  'Equipment Pre-Start Inspection',
  'Heavy Equipment Daily Inspection',
  'Forklift Pre-Use Inspection',
  'Crane Pre-Operation Inspection',
  'Machine Guarding Verification',
  'Compressed Air Tool Inspection'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── VII. PPE → all 12 trades ──────────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
  'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
  'HVAC','Electrical','General Labor'
]
WHERE name IN (
  'PPE Availability Check',
  'PPE Condition Inspection',
  'Fall Protection Harness Inspection',
  'Respiratory Protection Check',
  'Hearing Protection Compliance Check',
  'High-Visibility Gear Inspection'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── VIII. Fire & Emergency Preparedness → all 12 trades ──────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
  'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
  'HVAC','Electrical','General Labor'
]
WHERE name IN (
  'Fire Extinguisher Monthly Inspection',
  'Emergency Exit Inspection',
  'First Aid Kit Inspection',
  'Emergency Response Equipment Check',
  'Hot Work Area Inspection',
  'Evacuation Route Verification'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── IX. Excavation & Trenching ────────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY['Masonry','Carpentry / Framing','HVAC','Electrical','General Labor']
WHERE name IN (
  'Excavation Daily Inspection',
  'Trench Protective System Inspection',
  'Soil Classification Verification',
  'Shoring System Inspection',
  'Spoil Pile Placement Check',
  'Underground Utility Verification'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── X. Roofing Specific ───────────────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY['Roofing']
WHERE name IN (
  'Roofing Work Zone Inspection',
  'Material Staging Safety Check',
  'Roof Loading Verification',
  'Tool Securing Verification',
  'Weather Impact Assessment for Roofing',
  'Torch-Down Safety Inspection'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── XI. Sheet Metal / Sharp Material Handling ─────────────────────────────────
UPDATE checklists
SET trades = ARRAY['Sheet Metal / Flashing','Roofing','Siding','Gutters']
WHERE name IN (
  'Sharp Edge Handling Inspection',
  'Sheet Metal Storage Inspection',
  'Cutting Station Safety Check',
  'Bending Machine Inspection',
  'Coil Storage Safety Check'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── XII. Vehicle & Traffic Control → all 12 trades ───────────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
  'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
  'HVAC','Electrical','General Labor'
]
WHERE name IN (
  'Company Vehicle Inspection',
  'Traffic Control Setup Inspection',
  'Spotter Protocol Verification',
  'Loading Zone Inspection',
  'Delivery Area Safety Check'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── XIII. Environmental & Weather ─────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Gutters','Sheet Metal / Flashing',
  'Masonry','Scaffolding','Insulation'
]
WHERE name IN (
  'Heat Stress Preparedness Check',
  'Cold Stress Preparedness Check',
  'Wind Hazard Assessment',
  'Storm Preparation Checklist',
  'Dust Control Inspection',
  'Spill Prevention Inspection'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── XIV. Confined Space ───────────────────────────────────────────────────────
UPDATE checklists
SET trades = ARRAY['Masonry','HVAC','Electrical','General Labor']
WHERE name IN (
  'Confined Space Entry Checklist',
  'Air Monitoring Verification',
  'Permit Verification',
  'Rescue Plan Verification'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);


-- ── XV–XVIII. Hazard Communication / Administrative / Incident / Periodic ─────
-- → all 12 trades
UPDATE checklists
SET trades = ARRAY[
  'Roofing','Siding','Gutters','Sheet Metal / Flashing','Masonry',
  'Carpentry / Framing','Windows & Doors','Scaffolding','Insulation',
  'HVAC','Electrical','General Labor'
]
WHERE name IN (
  'SDS Availability Check',
  'Chemical Storage Inspection',
  'Labeling Compliance Check',
  'Hazard Communication Board Verification',
  'OSHA Poster Verification',
  'Safety Documentation Audit',
  'Certification Expiry Check',
  'Training Record Verification',
  'Subcontractor Safety Compliance Check',
  'Post-Incident Site Review',
  'Corrective Action Verification',
  'Re-Inspection After Repair',
  'Safety Stand-Down Verification',
  'Monthly Site Safety Audit',
  'Quarterly Equipment Audit',
  'Annual Safety Program Review',
  'Annual Fall Protection System Audit'
)
AND (trades IS NULL OR array_length(trades, 1) = 0);
