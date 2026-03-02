-- Add Ice Dam & Winter Roof Work Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Ice Dam & Winter Roof Work Safety (Snow, Ice, Cold Conditions)',
  'Weather & Environmental Hazards',
  'OSHA 29 CFR 1926.502',
  'Winter roofing presents compounding hazards: slippery surfaces, reduced grip strength from cold, hidden structural dangers under snow, and the physiological threat of cold stress and frostbite. Every element of winter work requires reassessment — conditions that were safe in the morning can change dramatically by midday.

• Pre-Access Surface Inspection
The roof surface must be inspected for ice, frost, and snow accumulation before any worker accesses the roof. Snow must be removed in controlled sections to maintain stable footing — never strip a large area at once, as this can shift the load distribution and expose hidden ice underneath. Ice buildup must be evaluated before walking on the surface; even thin black ice on membrane or metal surfaces is extremely hazardous. Hidden skylights under snow cover represent a critical fall-through risk and must be located and marked before any removal work begins.

• Fall Protection in Winter Conditions
Fall protection must be installed before snow or ice removal begins. Anchors must be inspected specifically for cold-weather performance — some hardware loses rated capacity at low temperatures. Lifelines must be kept clear of ice accumulation and routed away from sharp edges, as ice can compromise sheath integrity and edge contact increases the risk of cord failure during a fall.

• Ladder Safety in Cold Weather
Ladders must be thoroughly cleared of snow and ice before climbing. Ladder feet must be secured and placed on a stable, non-icy surface. Salt or traction aids should be applied at the ladder base when the ground surface is icy. Workers must maintain three points of contact at all times when climbing, as cold-stiffened hands and bulky gloves reduce grip significantly.

• Cold-Weather PPE
Workers must wear slip-resistant, winter-rated footwear with appropriate traction for icy surfaces. Gloves must be rated for cold conditions while still allowing adequate grip for tools and equipment. All PPE must be inspected to ensure it functions in cold temperatures — standard rubber and plastic components can become brittle and fail.

• Tools and Equipment in Cold
Tools must be kept free of ice buildup throughout the shift. Power tools must be inspected for cold-weather operation — batteries lose capacity in the cold and some pneumatic tools require lubricants rated for low temperatures. Electrical cords must be flexible and rated for low-temperature use; standard cords become stiff and cracked in freezing conditions, creating shock and trip hazards.

• Cold Stress and Work/Rest Management
Wind chill and frostbite risk must be assessed before the shift begins and reassessed if conditions change. Work/rest cycles must be adjusted for extreme cold — OSHA and ACGIH guidelines provide specific thresholds based on temperature and wind chill. A heated break area must be available for the crew at all times. Supervisors must monitor workers for signs of cold stress, including confusion, uncontrolled shivering, and loss of coordination.

• Roof Load and Structural Considerations
Roof load must be evaluated before heavy snow removal begins. Accumulated snow can exceed design loads, particularly on flat or low-slope roofs, and uneven removal can create unbalanced load conditions. Remove snow uniformly and in stages rather than clearing one section entirely before moving to the next.

• Ice Dam Steaming Equipment
Ice dam steaming equipment must be operated strictly per manufacturer guidelines. Steam hoses must be actively managed throughout the operation to prevent them from freezing in place or creating trip hazards on the slope. Discharge water from melting ice must be directed away from work areas and ladders to prevent refreezing.

• Ground Control and Falling Debris
Ice chunks, snow slabs, and debris cleared from the roof can fall without warning and with significant force. The ground area below the work zone must be barricaded and monitored throughout all snow and ice removal operations. Ground crew and bystanders must wear hard hats whenever overhead removal is in progress.

• Emergency Preparedness
An emergency plan must be reviewed with the full crew before each winter work shift, covering response to slips, falls, and cold stress emergencies. Response time for emergency services may be longer in winter conditions — ensure first aid supplies are on site and that at least one crew member is trained in cold injury treatment. Stop-work authority must be reinforced: any worker who observes conditions becoming unsafe — deteriorating weather, increasing ice, or a crew member showing signs of cold stress — must stop work immediately.

Remember: In winter, the hazards change faster than the work plan. Never assume this morning''s conditions will hold all day. Inspect continuously, communicate constantly, and never let schedule pressure override the safety of the crew.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Ice Dam & Winter Roof Work Safety (Snow, Ice, Cold Conditions)'
);
