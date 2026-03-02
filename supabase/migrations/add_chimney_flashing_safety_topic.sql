-- Add Working Around Chimneys & Flashing safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Working Around Chimneys & Flashing (Sharp Edges & Stability Hazards)',
  'Roofing Operations',
  'OSHA 29 CFR 1926.502',
  'Chimney and flashing work combines fall hazards, sharp material handling, structural uncertainty, and potential hot work — all in a confined area of the roof. The chimney itself can be a hazard: deteriorated masonry, unstable caps, and protruding flashing edges demand a careful assessment before any work begins.

• Structural Assessment
The chimney structure must be inspected for stability before any work begins. Masonry condition must be evaluated for loose or spalled bricks, deteriorated mortar joints, and signs of settlement or separation from the roof deck. No worker should lean against, push on, or apply lateral force to a chimney that has not been assessed as structurally sound. Flashing condition must be assessed before removal — corroded or heavily embedded flashing may require cutting rather than prying to avoid sudden movement.

• Fall Protection and Positioning
Fall protection must be maintained at all times while working near the chimney perimeter. Anchor placement must be carefully selected to avoid a swing fall that would send a worker into the chimney structure in the event of a fall — the anchor should be positioned so the fall arc clears all obstructions. Workers must establish stable footing before cutting, prying, or applying force to flashing. Workers must remain aware of their position relative to the roof edge at all times and never allow themselves to be backed toward the edge during tool use.

• Sharp Edge Hazards
Sharp metal edges are the primary hand injury hazard in flashing work. All cut edges of sheet metal, step flashing, counter flashing, and drip edge must be identified and treated as sharp. Cut-resistant gloves must be worn whenever handling flashing materials. Eye protection must be worn during all cutting and grinding operations, as metal fragments and sparks are produced unpredictably.

• Hot Work Controls
If torch work or grinding is required, a hot work permit must be issued before operations begin. Grinding sparks must be controlled and directed away from combustible materials, including roofing felt, underlayment, wood decking, and any debris accumulation. All combustible materials must be cleared from the chimney base area before torch or grinding work begins. A fire watch must remain in place during hot work and for a minimum period after completion.

• Chimney Cap and Flue Management
The chimney cap must be secured before removal to prevent it from dropping unexpectedly. Debris must not be allowed to fall through the flue opening — dropped tools or materials can damage the flue liner, block the chimney, or fall into the firebox below. Flue openings must be covered during all work periods to prevent accidental tool drops.

• Electrical and Chemical Safety
Power cords must be routed away from sharp flashing edges, which can cut through cord insulation and create shock hazards. Sealants, adhesives, and primers must be handled per manufacturer guidelines — many products used in flashing work contain solvents and must not be stored or used near open flames or sparks. All chemical products must be stored safely when not in active use.

• Falling Object Hazards
Tools must be secured to prevent them from sliding or rolling off the roof surface near the chimney. When removing heavy chimney components — caps, full sections of flashing, or masonry — the ground area below must be barricaded to protect workers and bystanders from falling material.

• Added Stability Measures
Where roof pitch or working height makes it difficult to maintain stable footing near the chimney, scaffold or roof jacks must be used to provide a stable working platform. Wind conditions must be monitored closely, especially near vertical surfaces like chimneys where wind can behave unpredictably and affect balance and tool control.

• Final Inspection and Emergency Preparedness
Upon completion, all installed flashing must be secured and inspected before the crew demobilizes — loose flashing left overnight can be displaced by wind and become a falling hazard. Stop-work authority must be reinforced with the entire crew: if any sign of chimney instability is observed at any point during work, operations must stop immediately and the structure must be assessed by a qualified person before work resumes.

Remember: Chimney and flashing work is detailed, close-quarters roof work with multiple simultaneous hazards. Take time to set up properly, protect your hands and eyes, control every sharp edge, and never rush a hot work operation.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Working Around Chimneys & Flashing (Sharp Edges & Stability Hazards)'
);
