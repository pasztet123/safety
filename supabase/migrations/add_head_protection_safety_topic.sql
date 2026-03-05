-- Add Head Protection Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Head Protection',
  'General / Jobsite Safety',
  'OSHA 29 CFR 1926.100',
  'Head injuries can be fatal or cause permanent brain damage. In roofing and exterior construction, the main threats are falling objects from above, walking into overhead structures, and impacts from loaded material lifts or crane operations. Hard hats are not optional accessories — on active construction sites, they are the last line of defense between a worker and a traumatic brain injury. A hard hat that is cracked, expired, or improperly worn is worse than useless because it creates false confidence.

• When Hard Hats Are Required
Hard hats are required whenever there is a risk of objects falling from above, bumping the head against fixed objects such as exposed pipes or beams, or falling while carrying materials. On roofing job sites, hard hats are required for all ground-level workers beneath elevated work, all workers assisting with material lifts, all workers in areas with overhead structural elements, and anyone in the immediate area of crane or boom truck operations.

• Hard Hat Types and Classes
Type I hard hats protect only the top of the head. Type II hard hats protect the top and sides — preferred for most construction environments. Electrical protection classes: Class G (General) — protects up to 2,200V; Class E (Electrical) — protects up to 20,000V; Class C (Conductive) — no electrical protection. Match the class to the hazard. Near power lines or electrical equipment, use Class E as a minimum.

• Inspection Before Use
Inspect the hard hat before every shift. Check the shell for cracks, gouges, dents, and UV degradation (chalky or faded surface indicates degraded plastic). Check the suspension system — broken or torn suspension dramatically reduces impact absorption. Give the shell a firm squeeze — a brittle cracking sound suggests UV damage. Any hard hat that fails inspection must be replaced immediately, not returned to service.

• Proper Fit and Wearing
A hard hat must be worn with the brim forward, or if the manufacturer explicitly approves reverse wear, set it accordingly — most hard hats are NOT approved for side-turned wear. The suspension must be adjusted so the hard hat sits snugly but does not touch the top of the head — the gap between the shell and suspension is the impact-absorption zone. Never wear a ball cap or beanie beneath a hard hat that eliminates this gap.

• Replacement Schedule and Damage Rules
Replace the suspension every 1–2 years regardless of visible condition, per manufacturer guidance. Replace the full hard hat after any significant impact — even if no visible damage is present — or at the manufacturer''s maximum service life (typically 5 years from the date of manufacture stamped inside the shell). Never paint a hard hat — paint solvents degrade the plastic shell.

• Heat and Storage Precautions
Never leave a hard hat on a vehicle dashboard or in direct sunlight for extended periods — UV heat accelerates shell degradation. Store hard hats away from chemicals, solvents, and extreme heat. Do not apply stickers over cracks or damage to conceal them.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Head Protection'
);
