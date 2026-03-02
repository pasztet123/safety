-- Add Steep-Slope Roof Work Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Steep-Slope Roof Work Safety',
  'Fall Protection',
  'OSHA 29 CFR 1926.502',
  'Steep-slope roofing is one of the most hazardous activities in construction. Falls from steep roofs are a leading cause of fatalities. Every worker must understand the unique risks associated with slope, height, and surface conditions before stepping onto the roof.

• Pre-Work Planning
Roof pitch must be assessed and documented before work begins. A steep slope is defined as greater than 4:12. The hazard assessment determines which fall protection systems are required. Appropriate fall protection must be selected based on both the slope angle and the working height above grade. A competent person must be present on-site when work requires it under OSHA regulations.

• Personal Fall Arrest System (PFAS)
The Personal Fall Arrest System must be inspected before each use and properly fitted to the worker. Anchors must be rated for fall arrest loads and installed strictly per manufacturer specifications — never improvise an anchor point. Lifelines must be positioned to prevent swing fall hazards; a worker should not be able to swing into a wall, edge, or obstruction if they fall.

• Guardrails, Warning Lines, and Roof Jacks
Guardrails or warning lines must be installed where feasible. Warning lines must be set back at least 6 feet from the roof edge. Roof jacks (toe boards) must be properly secured and spaced to provide stable footing and to prevent tools or materials from sliding off the roof edge.

• Ladder and Access Safety
Ladders must extend at least 3 feet above the roof edge at the point of access. Every ladder must be secured at both the top and bottom to prevent movement or kick-out. The access point onto the roof must be kept clear of debris and trip hazards at all times. Workers must maintain three points of contact when climbing ladders.

• Work Surface Conditions
Workers must never walk on wet, icy, or frost-covered surfaces. Wind conditions must be evaluated both before starting work and continuously during the workday — high winds increase fall risk significantly. Debris must be removed regularly to maintain safe footing on the slope. Skylights and any roof openings must be protected with covers rated for worker loads or clearly marked with high-visibility warning signs.

• Materials and Tools
Roofing materials must be staged to prevent sliding toward the roof edge. Loose shingles, felt, and underlayment must be secured against wind displacement. Power cords must be managed and routed to prevent tripping on the slope. All tools must be secured when not in active use to prevent falling objects hazards to workers below.

• Emergency Preparedness
The entire crew must be briefed on emergency rescue procedures before work begins. A rescue plan for a worker suspended in a PFAS must be in place — suspension trauma can incapacitate a worker within minutes. Stop-work authority must be reinforced so that any worker can and must halt operations if unsafe conditions arise without fear of retaliation.

• Daily Requirements
A pre-task hazard assessment must be completed every day before work starts. Conditions change — yesterday''s safe surface may be frost-covered this morning. Document the assessment, communicate findings to the crew, and adjust the work plan as needed.

Remember: Steep-slope roofing demands constant vigilance. Fall protection is not optional — it is the difference between going home and not going home. Never skip an inspection, never bypass an anchor, and always speak up when something does not look safe.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Steep-Slope Roof Work Safety'
);
