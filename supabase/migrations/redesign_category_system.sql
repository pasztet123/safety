-- =============================================================================
-- Redesign Safety Category System
-- Replaces the scattered, inconsistent category values with 12 canonical
-- "hazard type" categories, orthogonal to trades.
-- =============================================================================

-- ── 1. Remap safety_topics ────────────────────────────────────────────────────

UPDATE safety_topics SET category = CASE
  -- Fall & Height Hazards
  WHEN category IN (
    'Fall Protection',
    'Scaffolding & Elevated Work',
    'Roofing Safety',
    'Roofing Operations',
    'Work Platforms',
    'Access Equipment',
    'Access and Egress'
  ) THEN 'Fall & Height Hazards'

  -- Weather & Environmental
  WHEN category IN (
    'Weather & Environmental Hazards',
    'Environmental Hazards'
  ) THEN 'Weather & Environmental'

  -- Fire & Hot Work
  WHEN category IN (
    'Fire Safety & Hot Work',
    'Fire Safety'
  ) THEN 'Fire & Hot Work'

  -- Electrical Hazards
  WHEN category IN (
    'Electrical Safety',
    'Electrical Hazards'
  ) THEN 'Electrical Hazards'

  -- Chemical & Biological Hazards
  WHEN category IN (
    'Health & Industrial Hygiene',
    'Chemical Safety',
    'Hazardous Materials',
    'Atmospheric Hazards',
    'Respiratory Hazards',
    'Biological Hazards'
  ) THEN 'Chemical & Biological Hazards'

  -- Tools & Equipment Safety
  WHEN category IN (
    'Tools & Equipment',
    'Equipment Safety',
    'Heavy Equipment',
    'Powered Industrial Vehicles'
  ) THEN 'Tools & Equipment Safety'

  -- Material Handling & Struck-By
  WHEN category IN (
    'Material Handling'
  ) THEN 'Material Handling & Struck-By'

  -- Structural & Stability
  WHEN category IN (
    'Structural Safety',
    'Earthwork'
  ) THEN 'Structural & Stability'

  -- Medical & Emergency Response
  WHEN category IN (
    'Incident Management',
    'Emergency Preparedness'
  ) THEN 'Medical & Emergency Response'

  -- Behavioral & Substance Abuse
  WHEN category IN (
    'Substance Abuse'
  ) THEN 'Behavioral & Substance Abuse'

  -- Regulatory & Compliance
  WHEN category IN (
    'Energy Control'
  ) THEN 'Regulatory & Compliance'

  -- General / Jobsite Safety (catch-all for trade-specific and general categories)
  WHEN category IN (
    'Safety Culture',
    'Orientation & Training',
    'Personal Protective Equipment',
    'Noise Hazards',
    'Residential Jobsite Safety',
    'Exterior Work & Siding',
    'Safety Equipment'
  ) THEN 'General / Jobsite Safety'

  -- Keep anything already matching a canonical value
  WHEN category IN (
    'General / Jobsite Safety',
    'Fall & Height Hazards',
    'Weather & Environmental',
    'Fire & Hot Work',
    'Electrical Hazards',
    'Chemical & Biological Hazards',
    'Tools & Equipment Safety',
    'Material Handling & Struck-By',
    'Structural & Stability',
    'Medical & Emergency Response',
    'Behavioral & Substance Abuse',
    'Regulatory & Compliance'
  ) THEN category

  -- Fallback for anything else not explicitly mapped
  ELSE 'General / Jobsite Safety'
END
WHERE category IS NOT NULL;

-- ── 2. Remap checklists ───────────────────────────────────────────────────────

UPDATE checklists SET category = CASE
  -- Fall & Height Hazards
  WHEN category IN (
    'Fall Protection',
    'Scaffolding & Elevated Work',
    'Roofing Safety',
    'Roofing Operations',
    'Work Platforms',
    'Access Equipment',
    'Access and Egress'
  ) THEN 'Fall & Height Hazards'

  -- Weather & Environmental
  WHEN category IN (
    'Weather & Environmental Hazards',
    'Environmental Hazards'
  ) THEN 'Weather & Environmental'

  -- Fire & Hot Work
  WHEN category IN (
    'Fire Safety & Hot Work',
    'Fire Safety'
  ) THEN 'Fire & Hot Work'

  -- Electrical Hazards
  WHEN category IN (
    'Electrical Safety',
    'Electrical Hazards'
  ) THEN 'Electrical Hazards'

  -- Chemical & Biological Hazards
  WHEN category IN (
    'Health & Industrial Hygiene',
    'Chemical Safety',
    'Hazardous Materials',
    'Atmospheric Hazards',
    'Respiratory Hazards',
    'Biological Hazards'
  ) THEN 'Chemical & Biological Hazards'

  -- Tools & Equipment Safety
  WHEN category IN (
    'Tools & Equipment',
    'Equipment Safety',
    'Heavy Equipment',
    'Powered Industrial Vehicles'
  ) THEN 'Tools & Equipment Safety'

  -- Material Handling & Struck-By
  WHEN category IN (
    'Material Handling'
  ) THEN 'Material Handling & Struck-By'

  -- Structural & Stability
  WHEN category IN (
    'Structural Safety',
    'Earthwork'
  ) THEN 'Structural & Stability'

  -- Medical & Emergency Response
  WHEN category IN (
    'Incident Management',
    'Emergency Preparedness'
  ) THEN 'Medical & Emergency Response'

  -- Behavioral & Substance Abuse
  WHEN category IN (
    'Substance Abuse'
  ) THEN 'Behavioral & Substance Abuse'

  -- Regulatory & Compliance
  WHEN category IN (
    'Energy Control'
  ) THEN 'Regulatory & Compliance'

  -- General / Jobsite Safety
  WHEN category IN (
    'Safety Culture',
    'Orientation & Training',
    'Personal Protective Equipment',
    'Noise Hazards',
    'Residential Jobsite Safety',
    'Exterior Work & Siding',
    'Safety Equipment'
  ) THEN 'General / Jobsite Safety'

  -- Keep already-canonical values untouched
  WHEN category IN (
    'General / Jobsite Safety',
    'Fall & Height Hazards',
    'Weather & Environmental',
    'Fire & Hot Work',
    'Electrical Hazards',
    'Chemical & Biological Hazards',
    'Tools & Equipment Safety',
    'Material Handling & Struck-By',
    'Structural & Stability',
    'Medical & Emergency Response',
    'Behavioral & Substance Abuse',
    'Regulatory & Compliance'
  ) THEN category

  ELSE 'General / Jobsite Safety'
END
WHERE category IS NOT NULL;

-- ── 3. Verification queries (run manually to confirm) ─────────────────────────
-- SELECT DISTINCT category FROM safety_topics ORDER BY category;
-- SELECT DISTINCT category FROM checklists ORDER BY category;
