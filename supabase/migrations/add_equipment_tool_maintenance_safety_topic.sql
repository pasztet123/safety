-- Add Equipment & Tool Maintenance Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Equipment & Tool Maintenance',
  'Tools & Equipment Safety',
  'OSHA 29 CFR 1926.300',
  'Poorly maintained tools and equipment are a direct cause of workplace injuries. Worn saw blades deflect. Damaged compressor hoses burst. Nail guns with disabled safeties fire unintentionally. Equipment failures do not just inconvenience the crew — they cause amputations, lacerations, eye injuries, and falls. A structured maintenance routine protects everyone and extends equipment life. Every worker has a responsibility to inspect tools before use and report problems immediately.

• Daily Pre-Use Inspection
Before using any tool or piece of equipment, inspect it. Check power tools for damaged cords, cracked housings, missing guards, and loose fasteners. Check pneumatic tools for hose condition, fittings, and trigger function. Check hand tools for cracked handles, damaged striking faces, and bent shanks. A brief inspection takes 30 seconds and prevents injuries.

• Power Tools
Ensure all guards are in place and functional before use — never remove or disable guards. Check that switches work correctly and that the tool comes to a complete stop when released. Never use a tool with a damaged cord — frayed insulation is an electrocution and fire hazard. Ground all corded tools or verify they are double-insulated. Store power tools dry and away from chemicals.

• Pneumatic Tools and Air Compressors
Check air hoses for cracks, swelling, or cuts before each use. Drain moisture from the compressor tank daily. Verify the pressure safety relief valve works. Set regulated operating pressure per tool specifications — never exceed rated pressure. Inspect nail gun contact trips and trigger mechanisms — worn contact elements cause misfires. Follow OSHA lockout procedures before any maintenance.

• Saw Maintenance
Replace dull or chipped blades immediately — operators compensate for dull blades with extra force, increasing kickback risk. Never use a blade with missing or cracked teeth. Ensure blade guards retract and return smoothly. Keep blade tension correct on reciprocating and circular saws. Clean resin buildup from blades.

• Ladders and Access Equipment
Inspect ladders before each use. Look for cracked rails, bent rungs, missing slip-resistant feet, and broken locks. Never use a ladder that has been involved in a fall or struck by a vehicle without inspection by a competent person. Do not apply paint to wooden ladders — it hides cracks.

• Out-of-Service Procedure
Any tool or equipment that fails inspection must be immediately removed from service. Tag it with a clearly visible "DO NOT USE" tag and report it to the supervisor. Never leave a damaged tool in the tool bucket where another worker may unknowingly pick it up.

• Record Keeping
Maintain a basic maintenance log for major equipment — compressors, generators, lifts, and vehicles. Record inspection dates, issues found, and repairs made. Scheduled maintenance intervals from the manufacturer must be followed.',
  'medium'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Equipment & Tool Maintenance'
);
