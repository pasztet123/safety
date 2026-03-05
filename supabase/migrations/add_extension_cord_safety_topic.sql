-- Add Extension Cord Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Extension Cord Safety',
  'Electrical Hazards',
  'OSHA 29 CFR 1926.403; 29 CFR 1926.405',
  'Extension cords are among the most common sources of electrical hazards and fires on construction job sites. Damaged, overloaded, or improperly rated cords cause electrocutions, severe burns, and job site fires. In roofing and exterior construction, cords run across wet surfaces, over sharp roof edges, through high-traffic areas, and are subjected to repeated stress and abuse. An extension cord that looks fine on the outside can have internal insulation damage that creates an invisible shock and fire hazard. Every crew member must understand how to select, inspect, use, and store extension cords properly.

• Selecting the Right Cord
Extension cords must be rated for outdoor use (marked "W" or "W-A") when used outside. The cord gauge (AWG) must be appropriate for the tool''s amperage draw and the cord length — heavier loads and longer runs require lower AWG numbers (larger wire). Using a cord that is too light for the load causes overheating. As a general guide for construction: 14 AWG for up to 25 feet at 15 amps; 12 AWG for 25–50 feet; 10 AWG for 50–100 feet. Consult the cord''s ampacity rating before use.

• Pre-Use Inspection
Inspect the full length of every cord before use, every day. Look for: cuts, abrasions, or missing insulation; bent, broken, or burned plugs; loose connections at the plug ends; evidence of previous repair with tape (taped repairs are not acceptable — replace the cord). Pull lightly on the cord at each plug end — the jacket should not pull away from the plug body. Any cord failing inspection must be taken out of service immediately.

• Grounding
All extension cords used with grounded tools must be 3-wire grounded cords. Never use a 2-prong adapter ("cheater plug") to defeat the grounding requirement. The grounding pin must be intact — a missing grounding pin means the tool frame is ungrounded, creating an electrocution hazard.

• GFCI Protection
All 120V receptacles used outdoors or in wet/damp locations on construction sites must be GFCI-protected. If the power source is not GFCI-protected, use a GFCI adapter at the outlet or a cord with integrated GFCI at the plug. GFCI protection is not optional — it is the primary defense against electrocution from electrical faults in tools and cords.

• Safe Use Practices
Never run cords through doorways, windows, or walls where the cord can be pinched and damaged. Never run cords across walking paths without protection (use a cord cover ramp). Keep cords out of puddles and standing water. Do not daisy-chain extension cords end-to-end beyond one extension — this increases resistance and fire risk. Do not coil cords tightly during use — coiling generates heat. Disconnect by gripping the plug, never by yanking the cord.

• Storage
Coil cords loosely in large loops for storage. Hang cords on hooks to preserve the insulation — never fold or kink. Store inside away from UV and extreme temperatures. Replace any cord that has been run over by vehicles or equipment even if no visible damage is present.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Extension Cord Safety'
);
