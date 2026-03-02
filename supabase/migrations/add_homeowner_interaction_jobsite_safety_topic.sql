INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Homeowner Interaction & Jobsite Safety',
  'Residential Jobsite Safety',
  'OSHA 29 CFR 1926.25; 29 CFR 1926.200',
  'Residential jobsites present a category of hazard that commercial and industrial sites do not: the presence of uninformed, unprotected members of the public — homeowners, family members, children, pets, and neighbors — in and around an active construction zone. These individuals have no safety training, no PPE, and no situational awareness of the hazards created by roofing, siding, window, and exterior work. Every serious incident involving a homeowner or visitor on a residential jobsite was preventable. The crew''s professional responsibility does not stop at the work surface — it extends to the entire property and everyone on it.

• Pre-Work Safety Briefing and Zone Setup
A safety briefing must be conducted with the homeowner before work begins on the first day. The briefing must explain the active work scope, the hazard zones, and the specific areas that must remain off-limits during work hours. Access points to the work zone must be identified and restricted — this includes side yards, back gates, and any path that leads under or near an active drop zone. Warning signs must be posted at all entry points to the property where hazard areas are accessible. Drop zones must be clearly marked and physically barricaded; no member of the public should be able to walk under a debris drop zone or material staging area without passing a physical barrier.

• Protecting Occupants and Visitors
Children and pets must be kept out of all work zones for the duration of active work — this must be communicated directly to the homeowner and confirmed before work begins each day. Driveways and walkways must be assessed for public exposure; if the work creates overhead hazard along any pedestrian path, that path must be barricaded and an alternate route identified. Vehicles parked in driveways must be protected from falling materials or relocated before work begins above them. Landscaping in the work zone must be protected where possible or clearly marked so workers do not damage it, and so homeowners do not re-enter the area to check on plantings during active work.

• Tools, Equipment, and End-of-Shift Security
Tools must not be left unattended in areas accessible to children or the public at any point during the workday. Ladders must be removed from the structure or secured against unauthorized use whenever they are not actively in use — an unsecured ladder is an invitation for a child to climb onto a roof. Sharp materials — cut flashing, roofing nails, metal off-cuts — must be stored safely and out of reach at the end of each shift. Extension cords must be routed away from pedestrian paths and clearly visible to avoid trip hazards. Power tools must be unplugged and secured when not in use.

• Site Cleanliness and Daily Cleanup
The work area must be cleaned at the end of every shift — this is not optional and is not dependent on whether more work continues the next day. Nails and fasteners must be removed from all yard areas daily; a single roofing nail in a lawn can injure a child, damage a vehicle tire, or cause a serious laceration. A magnetic sweep must be performed around the property at the end of each workday to recover fasteners that have scattered during material handling and tear-off. Debris chute discharge areas must remain secured and cleared at all times during operation, not just at the end of the shift. Access to the property must be restored safely at the close of each workday — the homeowner must be able to use their home without navigating active hazards.

• Communication and Daily Coordination
The homeowner must be informed before debris removal begins so they can move vehicles, secure pets, and clear the area. The homeowner must be notified before roof access begins each day — particularly important for multi-day jobs where work resumes before the homeowner is aware. Noise levels and dust control measures must be communicated to the homeowner in advance, particularly for interior-adjacent work involving windows, doors, or siding removal. When window or door replacement work is involved, interior protection measures must be discussed before work begins. A daily progress update must be provided to the homeowner when required by the scope or duration of the project.

• Incident Response and Stop-Work Authority
Emergency contact information must be provided to the homeowner so they can reach the crew supervisor directly in the event of an issue. Any complaint or concern raised by the homeowner must be addressed immediately — homeowner concerns often indicate an actual hazard that the crew has normalized. If a homeowner or visitor is injured on or near the jobsite, the incident must be reported immediately through the company''s incident reporting process. Stop-work authority applies when public safety cannot be maintained — if site conditions, weather, or crew behavior creates an uncontrolled hazard to the public that cannot be immediately corrected, work must stop until controls are restored.

Remember: The homeowner trusted you with access to their home. Their family is inside or nearby. Every nail left in the yard, every unsecured ladder, and every unmarked drop zone is a failure of that trust — and a preventable incident waiting to happen.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Homeowner Interaction & Jobsite Safety'
);
