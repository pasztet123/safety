INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Lightning Risk & Storm Shutdown Protocol',
  'Weather & Environmental Hazards',
  'OSHA 29 CFR 1926.502',
  'Lightning is one of the most lethal weather hazards for outdoor workers. Roofing and elevated construction workers are among the most exposed populations — they are often the highest point in an open area, in contact with metal tools and equipment, with no natural shelter nearby. A lightning strike kills without warning and without a second chance. Every crew must have a defined shutdown protocol and must execute it without hesitation the moment conditions require it.

• Monitoring and Early Warning
The weather forecast must be reviewed before the shift begins each day. Weather radar must be monitored continuously throughout the day — not checked once in the morning. A lightning detection app or service must be used when available to provide real-time strike distance data. A supervisor must be specifically assigned to monitor storm conditions throughout the shift; this responsibility must not be left to individual workers to self-manage. The distance to the nearest lightning strike must be tracked and acted upon according to the company-defined threshold.

• Shutdown Triggers
The 30/30 rule is the minimum standard: if the time between a lightning flash and the thunder that follows is 30 seconds or less (approximately 6 miles), work at height must stop immediately. Many companies and authorities recommend more conservative thresholds — 10 miles or 8 miles — particularly for workers on elevated structures. The company-defined threshold must be established, communicated to the crew before the shift, and applied without negotiation. Crane and aerial lift operations must stop before general roof work stops — these systems are the highest points on the site and present the greatest risk.

• Descent and Evacuation
When the shutdown trigger is met, workers must immediately begin descending from the roof or scaffold. Metal tools and equipment must be left in place and must not be carried during descent — metal objects increase strike risk. Ladders must be cleared safely and quickly, but running is prohibited; a fall during evacuation is as dangerous as the storm itself. Workers must move directly to an enclosed building or a hard-topped vehicle with windows closed. Shelter must never be taken under trees, near isolated tall structures, or adjacent to metal scaffolding, guardrails, or equipment.

• Site Shutdown Procedures
Temporary power must be disconnected if required by site conditions. Generators must be shut down if it can be done safely before the storm arrives. Propane cylinders and flammable material storage must be secured before storm arrival. Loose materials on the roof and scaffold must be secured before shutdown to prevent wind and rain from displacing them. Ground drop zones must be cleared of all personnel before the storm arrives.

• Accountability
A headcount must be performed once the crew reaches safe shelter to confirm all workers are accounted for. Communication must be maintained among crew members and with the supervisor until the storm passes and the all-clear is given.

• Return to Work
A minimum wait time must be observed after the last detected lightning strike before returning to work — the standard is 30 minutes after the last strike within the defined radius, though company policy may be more conservative. Work must be resumed only after explicit authorization from the supervisor. Before resuming, the roof surface must be inspected for storm damage. Scaffold and all fall protection equipment must be re-inspected — ties may have shifted, planks may have displaced, and anchors may have been impacted by debris. Wet and slippery conditions must be fully evaluated before any worker returns to an elevated surface.

• Incident Documentation and Stop-Work Authority
If an emergency shutdown occurred, the event must be documented including the time, conditions, shutdown trigger used, and any issues encountered during evacuation. Stop-work authority applies to any active storm condition — no supervisor authorization is required for a worker to initiate descent when lightning is present. Any worker who sees lightning or hears thunder within the threshold distance has the authority and the obligation to call for immediate shutdown.

Remember: There is no task on a roof worth a lightning strike. The storm does not care about the schedule. Get down, get inside, wait it out, and inspect before you go back up.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Lightning Risk & Storm Shutdown Protocol'
);
