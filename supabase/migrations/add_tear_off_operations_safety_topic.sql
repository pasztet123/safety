-- Add Tear-Off Operations Safety (Roof Removal & Debris Handling) topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Tear-Off Operations Safety (Roof Removal & Debris Handling)',
  'Roofing Operations',
  'OSHA 29 CFR 1926.502',
  'Tear-off operations expose workers to a unique combination of hazards: weakened or unknown structural conditions, unstable footing on loose material, falling debris, and sharp fasteners underfoot. Thorough planning before the first shovel goes in is essential to a safe removal operation.

• Structural Assessment
The roof structure must be evaluated before tear-off begins. Soft spots and areas of weak or deteriorated decking must be identified, marked, and communicated to the entire crew before work starts. Workers must never stand on or work over decking that has not been assessed. Material loading must be considered throughout the process to avoid overloading sections of the structure that have been partially compromised.

• Fall Protection Setup
All fall protection must be installed and verified before any material removal begins — not after. Guardrails, warning lines, or a Personal Fall Arrest System must be in place at all roof edges. Skylights and roof openings must be protected before tear-off starts, as the activity of removal can expose or enlarge openings that were previously hidden under existing roofing.

• Removal Sequence and Footing
The material removal sequence must be planned in advance to maintain safe footing throughout the operation. Debris must be removed in controlled sections — never strip large areas at once, as this creates expanses of loose material with no stable surface. Workers must be positioned to avoid standing on loose shingles, felt, or insulation. As materials are removed and footing conditions change, the crew must continuously reassess safe standing positions.

• Fastener and Nail Hazards
Roofing nails and fasteners must be continuously cleared from the work area as tear-off progresses — loose nails on a sloped surface are a primary cause of slips and puncture injuries. A magnetic sweep must be conducted at ground level at the end of each day to protect ground workers and visitors. Gloves must be worn at all times to prevent puncture wounds from exposed nails and staples.

• Tools and Crew Spacing
Tear-off shovels, pry bars, and all removal tools must be inspected before use for damaged handles, worn blades, and secure connections. Workers must maintain adequate spacing from one another during active removal to avoid contact injuries from swinging tools. Eye protection is required during mechanical removal where fragments and fasteners may become airborne.

• Debris Handling and Ground Control
A debris chute, where used, must be properly secured to the structure and inspected for stability. The discharge area at ground level must be barricaded to prevent unauthorized entry beneath the drop zone. Debris must never be thrown directly from the roof unless the area below is fully barricaded and controlled. The dump trailer or container must be positioned to minimize the distance workers carry or move loaded debris. Ground crew members must wear hard hats whenever overhead removal work is in progress.

• Environmental and Chemical Hazards
Dust exposure must be assessed prior to and during tear-off, especially when removing older materials that may contain asbestos or silica-bearing products. Respiratory protection must be used when dust levels exceed safe thresholds or when hazardous materials are suspected. Wind conditions must be monitored throughout the day — loose shingles and felt can become airborne in wind gusts, creating hazards both on the roof and at ground level.

• Electrical Hazards
Electrical service lines must be identified before removal begins in any area near the service mast or electrical penetrations. Maintain required clearance distances and coordinate with the utility if work must occur within the exclusion zone.

• Emergency Preparedness
An emergency egress path must be maintained throughout the entire tear-off process. As sections of the roof are opened up, access routes can be compromised — the competent person must ensure at least one clear, safe exit is always available. Stop-work authority must be reinforced with the entire crew: if structural instability is observed at any point, work must halt immediately until a qualified assessment is completed.

Remember: Tear-off is one of the highest-risk phases of any roofing project. The roof is at its most dangerous when existing systems have been removed and the deck is exposed. Maintain discipline in protection setup, debris control, and structural awareness from the first shovel to the final sweep.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Tear-Off Operations Safety (Roof Removal & Debris Handling)'
);
