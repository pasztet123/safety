-- Add Downspout Installation Near Electrical Lines safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Downspout Installation Near Electrical Lines',
  'Electrical Safety',
  'OSHA 29 CFR 1926.416',
  'Downspout installation frequently occurs in close proximity to electrical service drops, meter bases, and conduit — all of which may be energized. Metal downspout sections are excellent electrical conductors. A single uncontrolled contact between a metal section and an energized service line can cause electrocution instantly. This hazard is consistently underestimated because the work appears routine and the lines are familiar fixtures on every house.

• Identifying the Hazard Before Work Begins
Overhead electrical lines must be identified before any work begins. The service drop location must be evaluated relative to the full scope of the downspout installation route. Minimum safe clearance distances must be confirmed — OSHA requires at least 10 feet of clearance from lines up to 50kV for unqualified workers, and this clearance applies to the worker, the tool, and any material being handled. Utility voltage must always be assumed to be energized unless the utility has confirmed a disconnection in writing. No assumption of de-energization based on appearance is acceptable.

• Work Planning
The downspout installation sequence must be planned to avoid direct contact with or work beneath the service drop wherever possible. If the installation route cannot be completed while maintaining safe clearances, the utility company must be contacted to arrange a temporary disconnect or service relocation before work proceeds. This coordination must happen before workers arrive on site — not after a clearance issue is discovered during installation.

• Ladder Selection and Positioning
Non-conductive (fiberglass) ladders must be used whenever work is performed near electrical lines. Metal ladders must never be used near energized lines under any circumstances. The ladder must be positioned to maintain safe clearance from all conductors — account for the worker''s reach and the length of any material being handled from the ladder. The extension ladder must be secured before climbing. The positioning of the ladder must be verified with the clearance distance in mind, not just the physical access to the work point.

• Handling Long Metal Sections
Long metal downspout sections must be handled with two-person control to maintain directional stability throughout the lift. Materials must be kept horizontal and controlled at all times during lifting and positioning — a section raised vertically near a service drop can contact the line before the worker is aware of the proximity. Workers must never raise metal sections vertically in the vicinity of overhead lines. Downspout sections must be staged away from the electrical service area before installation begins.

• Never Reach Across or Under the Service Drop
Workers must not reach across or under the service drop at any time, regardless of the perceived clearance. The service drop sags and its height varies with temperature, load, and age. What appears to have adequate clearance visually may not provide the required safe distance under working conditions.

• Tools and Electrical Equipment
Power tools must be inspected before use. GFCI protection must be verified for all temporary power connections. Extension cords must be kept clear of service lines and must not be routed across or near the drop.

• Spotter and Ground Control
A spotter must be assigned whenever work is performed near overhead lines — the spotter''s sole responsibility is monitoring clearance distances and stopping the work if the safe zone is approached. The ground area below overhead installation work must be barricaded. Wind conditions must be evaluated before lifting long sections — wind can cause a long section to drift toward lines that appeared safely distant.

• PPE
Gloves must be worn to reduce slip and improve grip on metal sections. Eye protection must be worn during cutting and fastening operations. Gloves do not provide protection from electrical contact — they are for grip and laceration control only.

• Contact Avoidance — Mast, Meter Base, and Conduit
Workers must avoid all contact with the service entrance mast, meter base, and conduit. These components are part of the energized system and contact with them carries the same electrocution risk as contact with the line itself. If the downspout installation requires work adjacent to the mast or meter, a safe approach procedure must be established before work begins.

• Emergency Response
An emergency response plan must be reviewed with the crew before work begins, specifically covering the response to electrical contact. If a worker contacts an energized line: do not touch the victim, call 911 immediately, and disconnect power at the main breaker only if it can be done without approaching the hazard. Stop-work authority must be exercised immediately if safe clearance cannot be maintained at any point during the work — no amount of schedule pressure justifies exposure to an energized line.

Remember: Electricity does not warn you before it kills. Every metal downspout section is a potential conductor from the moment it is lifted. Plan the clearances, use non-conductive ladders, assign a spotter, and contact the utility when the work cannot be done safely without their involvement.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Downspout Installation Near Electrical Lines'
);
