-- Add Gutter Installation & Edge Work Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Gutter Installation & Edge Work Safety',
  'Fall Protection',
  'OSHA 29 CFR 1926.502',
  'Gutter installation is fundamentally edge work — every task takes place at or near the roof perimeter, the most dangerous location on any structure. The combination of ladder work, long material handling, and repetitive repositioning along the building creates sustained fall exposure throughout the entire job. Complacency is the primary hazard in gutter work; the tasks feel routine until a fall occurs.

• Fall Protection Setup
The roof edge exposure must be evaluated before any work begins. Fall protection must be installed wherever required. Where feasible, warning lines or guardrails must be installed at the roof perimeter. Where workers must access the edge directly, a Personal Fall Arrest System must be inspected before use and properly fitted to the worker. Anchors must be rated for fall arrest loads and positioned to minimize swing fall distance — the anchor must be above the worker and the fall arc must be free of obstructions.

• Ladder Safety
Ladders must be inspected before each use for damage, missing hardware, and worn feet. The ladder angle must be set correctly — a 4:1 ratio (one foot out for every four feet of height) for straight ladders. The ladder must be secured at the top and bottom to prevent movement. The ladder must extend at least 3 feet above the landing surface at the roof access point. Workers must maintain three points of contact when climbing or descending at all times. Overreaching from a ladder is prohibited — the ladder must be repositioned to keep the worker''s belt buckle within the rails. When ladder access is insufficient for the scope of work, scaffold or an aerial lift must be used.

• Long Material Handling
Two-person handling must be used for long gutter sections — a single worker carrying a 10- or 20-foot gutter run cannot maintain balance, three points of contact, and material control simultaneously. Gutter sections must be staged away from the roof edge to prevent them from sliding or being displaced into the drop zone below. Materials must be secured against wind displacement, particularly light aluminum sections that can act as sails in gusts.

• Sharp Edge and Tool Hazards
Freshly cut metal gutter edges are extremely sharp. Cut-resistant gloves must be worn whenever handling cut sections, end caps, and mitered corners. Eye protection must be worn during all cutting and fastening operations. Tin snips and cutting tools must be inspected before use for proper function and secure handles. Power tools must be connected to GFCI-protected outlets. Extension cords must be routed to avoid trip hazards at ladder bases and around the building perimeter.

• Falling Object and Ground Control
The ground drop zone must be identified and barricaded during all overhead gutter work — fasteners, end caps, sections, and tools dropped from height can cause serious injury to anyone below. Tools must be secured when not in active use to prevent them from rolling or being knocked off scaffold or ladder platforms. Fasteners and small parts must be contained in pouches or buckets to prevent them from rolling off elevated surfaces.

• Electrical Clearance
Downspout installation near electrical service lines must be evaluated for required clearance distances before work begins. Metal gutters and downspouts conduct electricity. Contact between a downspout and an energized service line during installation has caused electrocution fatalities. Maintain required clearances or coordinate with the utility before working in proximity to service lines.

• Environmental Conditions
Weather conditions must be monitored throughout the workday, particularly wind gusts — sustained wind or gusts make long panel handling and ladder work significantly more dangerous. Wet or icy surfaces at ladder bases, on scaffold platforms, and along the roof edge must be identified and controlled before edge work begins. Work must not proceed on icy or frost-covered surfaces.

• Housekeeping
Debris — scrap metal, cut-offs, fasteners, and packaging — must be removed from the roof surface and ladder area regularly throughout the shift. Accumulated debris at a ladder base is a primary cause of ladder slip and fall-on-dismount injuries.

• Emergency Preparedness
An emergency rescue plan must be reviewed with the crew before work begins. A worker suspended in a PFAS requires prompt rescue — suspension trauma can incapacitate a worker within minutes. Stop-work authority must be reinforced: if edge protection is compromised, a ladder becomes unstable, or weather conditions deteriorate to an unsafe level, work must stop immediately.

Remember: Every foot of gutter run is a foot of unprotected edge work. The job does not end until the last downspout bracket is set and every worker is safely back on the ground. Maintain protection from the first ladder placement to the last.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Gutter Installation & Edge Work Safety'
);
