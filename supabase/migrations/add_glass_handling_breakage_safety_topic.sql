-- Add Glass Handling & Breakage Response safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Glass Handling & Breakage Response (Large Pane Transport & Breakage)',
  'Material Handling',
  'OSHA 29 CFR 1926.250',
  'Large pane glass handling is among the most unforgiving tasks on a job site. A single misstep during transport or installation can result in catastrophic lacerations, amputations, or fatal crushing injuries. Every step — from the moment a pane is lifted off the rack to the moment it is secured in place — requires deliberate control.

• Pre-Lift Assessment
Glass weight and size must be assessed before any lift begins. No worker should attempt to lift a pane without knowing its approximate weight and verifying the required number of handlers. Two-person lifts are required for oversized panes; the threshold must be determined based on pane size, weight, and site conditions. A mechanical lifting aid must be used whenever manual handling is impractical or exceeds safe manual lift limits.

• Personal Protective Equipment
Cut-resistant gloves must be worn at all times during glass handling — this is non-negotiable. Long sleeves must be worn to reduce laceration risk to the forearms in the event of a slip or break. Safety glasses or a face shield must be worn during all handling and installation operations to protect against glass fragments. Standard work gloves do not provide cut resistance and must not be substituted.

• Suction Cup Equipment
Suction cups must be inspected before each use for cracking, deterioration of the sealing surface, and proper function of the release mechanism. Each suction cup must be tested for secure attachment on the actual pane before the lift begins — test on a horizontal surface at low height before committing to a full lift. Never rely on a suction cup that has not been verified under load.

• Transport and Path Management
Glass must be transported vertically, not flat, unless the manufacturer explicitly permits horizontal transport for that product. The path of travel must be fully cleared before movement begins — trip hazards, tools, cords, and debris must be removed from the entire route. Communication between carriers must be established before movement starts: a clear call-and-response system for stops, turns, and placement ensures coordinated control throughout transport. Glass must never be carried up an unsecured ladder — scaffold or a mechanical lift must be used for elevated installation work.

• Storage
Glass must be stored in a stable A-frame rack designed for the purpose. The rack must be positioned on a level surface and must not be placed where it could be struck by vehicles or equipment. Glass must be secured to the rack to prevent tipping — unsecured panes on a rack are a silent hazard that can cause injury without warning.

• Exterior and Elevated Work
Wind conditions must be evaluated before any exterior glass lifting — wind loading on large panes can overpower handlers instantly. Workers must never stand directly below a lifted pane during installation. The area below any elevated glass lift must be barricaded to protect ground workers and bystanders from falling glass. Scaffold or a mechanical lift must be used wherever height makes manual transport unsafe.

• Breakage Response
When glass breaks, no worker may handle broken pieces with bare hands under any circumstances. Broken glass must be immediately isolated from the work area to prevent others from stepping on or into it. All sharp debris must be collected using tools — brooms, scrapers, and tongs — and placed into a rigid, clearly labeled container. The container must not be a standard trash bag, which can be punctured and cause injury during disposal.

• Incident Reporting and First Aid
Any injury involving glass — including minor lacerations — must be reported immediately. A first aid kit must be accessible on site at all times, with supplies appropriate for laceration treatment. Deep or heavily bleeding lacerations require emergency medical response; do not delay by attempting to treat serious wounds with basic first aid alone. Stop-work authority applies: if lifting conditions become unsafe at any point — wind, unstable surface, equipment malfunction, or understaffing — work must stop until conditions are corrected.

Remember: Glass does not give warnings before it breaks. One compromised suction cup, one missed trip hazard, one moment of miscommunication between carriers can result in a life-altering injury. Treat every pane as the hazard it is, every time.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Glass Handling & Breakage Response (Large Pane Transport & Breakage)'
);
