-- Add Compressed Gas Cylinders Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Compressed Gas Cylinders',
  'Fire & Hot Work',
  'OSHA 29 CFR 1926.350',
  'Compressed gas cylinders — propane, oxygen, acetylene, and others — are under extreme pressure and contain flammable or asphyxiating contents. Improper handling, storage, or use can result in fire, explosion, or rapid gas release. In roofing operations, propane cylinders for torch-down and heat welding work are among the most common sources of serious fires on job sites. Every worker who handles or works near cylinders must understand the hazards and proper procedures.

• Inspection Before Use
Every cylinder must be visually inspected before each use. Look for physical damage — dents, deep rust, cracks, or a damaged valve. Never use a cylinder with a leaking valve, missing protective cap, or damaged regulator. If a cylinder is questionable, take it out of service and tag it. Check that the regulator is compatible with the cylinder type — never force a connection.

• Transportation and Movement
Cylinders must never be dragged, rolled on their side, or dropped. Use an approved cylinder cart or hand truck with a chain to secure the cylinder upright. Never lift cylinders by the valve or cap — if the valve breaks off, the cylinder becomes an unguided projectile. Secure cylinders in vehicles to prevent tipping and rolling during transit.

• Storage Requirements
Store cylinders upright and secured with chains, racks, or straps at all times — even when empty. Keep oxygen and fuel gas cylinders at least 20 feet apart or separated by a 5-foot non-combustible barrier with a minimum 30-minute fire rating when in storage. Store cylinders away from heat sources, open flames, electrical panels, and direct sunlight. Empty cylinders must be marked "MT" or "Empty" and stored separately from full ones.

• On-Site Use — Propane for Torch-Down Roofing
When using propane for torch-applied roofing membrane work: position the cylinder at least 10 feet from flammable materials. Never leave a lit torch unattended. Have a fire extinguisher rated for flammable gas fires immediately accessible. After completing a section, inspect the area for smoldering — torch-down fires often start inside walls or under materials and are not visible for 15–30 minutes. Assign a fire watch.

• Leak Detection
Never test for gas leaks with an open flame. Use an approved leak-detection solution or electronic gas detector. If you smell gas: extinguish all ignition sources, move away from the area, ventilate if safe to do so, and do not resume work until the leak is found and corrected. Treat every unexplained gas smell as an emergency.

• Valve and Regulator Safety
Always open cylinder valves slowly. When a cylinder is not in use, close the valve completely — even for short breaks. Keep protective caps on cylinder valves whenever a regulator is not attached. Never use oil or grease on oxygen fittings — this combination can cause spontaneous ignition.

• Emergency Response
If a cylinder is involved in a fire and cannot be safely removed, evacuate the area and call 911. Do not attempt to fight a fire involving a pressurized cylinder without proper training and equipment.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Compressed Gas Cylinders'
);
