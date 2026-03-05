-- Add Amputations Prevention Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Amputations Prevention',
  'Tools & Equipment Safety',
  'OSHA 29 CFR 1926.300; 29 CFR 1910.147',
  'Amputations are among the most severe and permanently disabling injuries in the construction industry. They happen in seconds. In roofing, siding, and exterior construction, the primary causes are nail guns, circular saws, reciprocating saws, and abrasive cutting wheels. Nearly all amputation incidents share a common factor: a guard was bypassed, a safety was disabled, or a worker''s hand or limb entered a danger zone they believed was safe. Understanding and respecting the mechanisms that cause amputations is the first step in prevention.

• Nail Guns — Leading Cause in Roofing
Nail guns cause more nail-related injuries than hammers. The two most dangerous practices: disabling the contact trip to allow "bump firing" (multiple rapid shots by holding the trigger and bumping the tip), and using bump-fire around other workers. Most nail gun amputations involve fingers and are caused by misfires through materials, double-fires, and reckless handling. Always use sequential-trip (single-shot) mode in occupied work areas. Never point a nail gun toward yourself or others, even briefly. Keep your free hand behind the nose of the tool at all times.

• Circular and Reciprocating Saws
Never remove or modify blade guards. Never reach under or behind material being cut while the blade is spinning. Use push sticks or guides when ripping narrow stock. Ensure the workpiece is fully secured — loose materials shift into blades and force kickback. Keep both hands on the tool during a cut. Unplug or disconnect air before changing blades or clearing jams.

• Abrasive Wheels and Angle Grinders
Never use a disc with cracks, chips, or heavy wear. Never exceed rated RPM — overspeed shatters discs violently. Ensure disc guards are in place and properly positioned. Stand to the side of the wheel, not directly in line with its rotation. Allow the wheel to come to a complete stop before setting the tool down.

• Lockout/Tagout Before Any Maintenance
Before clearing a jam, adjusting a blade, changing a bit, or performing any maintenance on a power tool: disconnect the power source. For pneumatic tools, disconnect the air supply AND exhaust residual pressure. For corded tools, unplug. For battery tools, remove the battery. Never reach into an obstruction with a tool energized.

• Work Positioning and Body Placement
Before any cut, think through where your hands will be if the tool slips, kicks back, or the material moves. Position yourself so that neither hand is in the path of the blade. Secure the workpiece with clamps or a second worker holding from a safe position — never with a hand close to the cut line.

• Immediate Response to an Amputation
If an amputation occurs: call 911 immediately. Apply direct pressure to control bleeding. Preserve the amputated part — wrap it in a clean, moist cloth, place in a sealed bag, and keep cool (not frozen). Bring it to the hospital with the injured worker. Speed of response is critical for reattachment outcomes.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Amputations Prevention'
);
