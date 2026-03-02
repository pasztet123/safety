-- Add Low-Slope / Flat Roof Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Low-Slope / Flat Roof Safety (EPDM, TPO, PVC, Membrane Systems)',
  'Fall Protection',
  'OSHA 29 CFR 1926.502',
  'Low-slope and flat roofing involves unique hazards distinct from steep-slope work. Large open surfaces, chemical adhesives, heat welding equipment, and unprotected edges all demand careful planning and strict hazard control. Every worker must be briefed before stepping onto the roof.

• Roof Access and Perimeter Protection
Roof access must be inspected and secured before beginning work. Perimeter fall protection must be installed using guardrails, warning lines, or a Personal Fall Arrest System (PFAS) — or a combination of these. Warning lines must be placed at the proper setback distance from the roof edge (at least 6 feet for low-slope roofs). Workers operating inside warning lines must use additional protection or a safety monitoring system supervised by a competent person.

• Roof Openings and Skylights
All roof openings must be covered with materials capable of supporting at least 200 lbs, secured against displacement, and clearly labeled "OPENING — DO NOT REMOVE." Skylights present a fall-through hazard and must be protected with guards or covers that meet the same load requirements. Never assume a skylight dome is load-bearing.

• Personal Fall Arrest System (PFAS)
PFAS equipment must be inspected before each use for wear, damage, and proper function. Anchor points must be rated for fall arrest loads and must be compatible with the membrane system — some membrane surfaces cannot support certain anchor types without special hardware. Workers must be trained specifically on leading-edge fall protection requirements, as leading-edge work presents dynamic fall factors.

• Surface and Environmental Hazards
Wet, icy, or chemically contaminated surfaces must be identified before work begins and controlled — either by drying, treating, or restricting access. Loose insulation boards must be secured or staged flat to prevent displacement underfoot. Wind conditions must be monitored throughout the day, particularly during installation of large membrane sheets, which can act as sails and cause loss of balance or material displacement.

• Material Handling and Staging
Membrane rolls must be staged away from the roof edge to prevent rolling off. Material loading must be evaluated before delivery to ensure the roof structure is not overloaded — consult structural drawings or a qualified person if load limits are unknown. Drain locations must be identified before work begins and kept clear throughout to prevent ponding.

• Chemical Safety
Adhesives, primers, and solvents must be stored in a shaded, well-ventilated area away from heat sources and ignition points. Chemical Safety Data Sheets (SDS) must be accessible on site for every product in use. Proper PPE — including chemical-resistant gloves, eye protection, and respiratory protection where required — must be worn when handling solvents and adhesives.

• Electrical and Heat Welding Safety
Heat welding equipment must be inspected before each use for cord integrity, nozzle condition, and temperature controls. A fire extinguisher must be present and immediately accessible whenever heat welding operations are in progress. All temporary power must be protected with GFCI devices, and extension cords must be elevated or routed to avoid contact with standing water.

• Housekeeping and Walk Paths
Trip hazards must be minimized by continuously managing scrap membrane, cut materials, and tools. Designated walk paths must be established on finished membrane areas to protect both workers and the installed system. Debris must be removed regularly to maintain safe footing.

• Emergency Preparedness and Oversight
An emergency rescue plan must be reviewed with the full crew before work begins. A competent person must conduct a daily inspection before work starts each day to identify new hazards from overnight weather, deliveries, or changes to work scope. Stop-work authority applies to all workers — anyone who observes an unsafe condition must stop work and report it immediately.

Remember: Flat roofs can create a false sense of security due to the absence of obvious slope. Edges, openings, and chemical hazards are just as deadly as a steep pitch. Stay alert, respect all protection systems, and never shortcut the setup process.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Low-Slope / Flat Roof Safety (EPDM, TPO, PVC, Membrane Systems)'
);
