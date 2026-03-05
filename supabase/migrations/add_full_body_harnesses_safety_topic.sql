-- Add Full Body Harnesses Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Full Body Harnesses',
  'Fall & Height Hazards',
  'OSHA 29 CFR 1926.502(d)',
  'The full body harness is the primary component of a Personal Fall Arrest System (PFAS). When a fall occurs, the harness is the only thing standing between the worker and a fatal impact. A harness that is improperly fitted, damaged, or incorrectly connected to an anchor system will fail to prevent serious injury. Every roofing crew member working at 6 feet or more above a lower level must be trained on, fitted for, and properly wearing a full body harness before stepping onto the roof.

• Inspection Before Each Use
Inspect the harness before every single use — do not assume it is safe because it was used yesterday. Check all webbing for cuts, abrasion, chemical staining, heat damage, and brittleness. Check all stitching — look for broken threads, pulled seams, or separation at load points. Inspect all D-rings for sharp edges, bends, cracks, and corrosion. Check buckles for proper closure and release function. Any harness with damage must be immediately removed from service and destroyed or clearly tagged out.

• Proper Fit and Donning
A harness must be sized and adjusted for the specific worker wearing it. Start by identifying the dorsal D-ring — it must sit centered between the shoulder blades. Leg straps must be snug but allow two fingers to slide through — loose leg straps will allow the worker to slip through on arrest. Shoulder straps must lie flat and hold the D-ring in the correct position. Chest strap must be at mid-chest level. Never share a harness between workers without readjusting all straps.

• Connecting to the Anchor and Lanyard
Use only lanyards and connectors rated for fall arrest use — a positioning lanyard is NOT a fall arrest lanyard. The snap hook must be fully closed and locked before leaving the anchor. Verify every connection by giving a firm tug after connecting. Never connect a snap hook back to its own webbing (back-hooking) — this can break the gate. The total fall distance (free fall + deceleration + worker height) must be calculated to ensure the worker will not strike a lower level before arrest is complete.

• Anchor Requirements
Anchors for fall arrest must be capable of supporting 5,000 lbs per attached worker, or be designed to a safety factor of 2 by a qualified person. Roof anchors must be installed per manufacturer specifications — never improvise an anchor. Do not use plumbing, electrical conduit, or vent pipes as anchor points.

• Post-Fall Protocol
Any harness involved in a fall arrest must be immediately taken out of service regardless of visible damage. The sudden arrest load stresses the webbing and hardware internally in ways not visible to the eye. Tag the harness "DO NOT USE — FALL OCCURRED" and report the incident.

• Storage and Maintenance
Store harnesses away from direct sunlight, heat, chemicals, and sharp objects. Never store a harness in a tool bucket with sharp tools. Hang harnesses on a dedicated hanger or hook. Clean soiled harnesses with mild soap and water only — no solvents.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Full Body Harnesses'
);
