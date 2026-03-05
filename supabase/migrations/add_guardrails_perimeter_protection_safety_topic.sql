-- Add Guardrails & Perimeter Protection Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Guardrails & Perimeter Protection',
  'Fall & Height Hazards',
  'OSHA 29 CFR 1926.502(b)',
  'Guardrails and perimeter protection systems are passive fall prevention controls — they stop workers from reaching the fall hazard in the first place, without requiring the worker to do anything. On roofing and exterior construction jobs, properly installed perimeter protection is one of the most reliable ways to prevent falls. Unlike harness systems, guardrails protect everyone in the area, not just the worker wearing equipment. Where guardrails are feasible, they are the preferred fall protection method.

• When Guardrails Are Required
Guardrail systems are required whenever workers are exposed to a fall of 6 feet or more to a lower level on construction sites. This includes roof edges, floor openings, leading edges, stairway openings, and wall openings. If a guardrail system is the selected method of protection, it must be installed before workers are allowed in the hazard zone.

• Guardrail System Components and Heights
The top rail of a guardrail system must be 42 inches (plus or minus 3 inches) above the walking-working surface. A mid-rail must be installed at approximately 21 inches. If the system uses more than one intermediate member, spacing must be such that a 19-inch sphere cannot pass through. Posts must be spaced so that the rail does not deflect beyond the required load under pressure.

• Load Requirements
Top rails must be able to withstand a force of at least 200 lbs applied in any outward or downward direction at any point along the top edge. Mid-rails must withstand 150 lbs. Systems that fail to meet these loads must be reinforced or replaced before worker access.

• Toeboards
Where tools, materials, or equipment can fall from a working surface and strike workers below, toeboards must be installed along all open edges. Toeboards must be at least 3.5 inches high, with no more than 0.25-inch clearance above the floor. Toeboards prevent tools and debris from sliding or rolling off the edge.

• Roof Edge — Warning Lines as an Alternative
When guardrails are not feasible, a warning line system may be used on low-slope roofs of 4:12 or less. Warning lines must be erected no closer than 6 feet from the roof edge. The warning line must be rigged at 34–39 inches above the working surface and must support 16 lbs without creating a 4-inch sag. All work must be performed on the inboard side of the warning line. Warning lines alone are not acceptable on steep slopes.

• Inspection and Maintenance
Inspect guardrail systems before each shift. Check all posts, rails, and connections for damage, displacement, or loosening caused by wind, equipment, or worker contact. Damaged sections must be repaired or replaced before workers access the protected area. Never remove guardrail sections without immediately substituting another form of fall protection for all workers in the affected area.

• Prohibited Actions
Never lean against, sit on, or use a guardrail as a handhold for climbing. Never remove mid-rails temporarily to move materials through without immediately reinstalling them. Never substitute caution tape for a code-compliant guardrail system.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Guardrails & Perimeter Protection'
);
