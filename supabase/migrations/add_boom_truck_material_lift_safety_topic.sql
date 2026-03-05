-- Add Boom Truck & Material Lift Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Boom Truck & Material Lift Safety',
  'Tools & Equipment Safety',
  'OSHA 29 CFR 1926.1400',
  'Boom trucks and material lifts are used daily in roofing and siding operations to load shingles, lumber, panels, and other heavy materials onto elevated work surfaces. While these machines greatly reduce manual handling risk, they introduce serious hazards — including tip-over, struck-by, and electrocution — when operated improperly or near overhead power lines. Every crew member involved in a lift operation must understand their role and the associated hazards before the machine starts moving.

• Pre-Operation Inspection
Inspect the boom truck or material lift before each day of operation. Check hydraulic hoses and fittings for leaks. Verify all safety devices — outriggers, overload indicators, load charts, and limit switches — are functional. Check tire condition and pressure. Review the operator manual for the specific machine. Report any deficiencies to your supervisor before operating.

• Load Capacity and Load Charts
Never exceed the rated load capacity of the equipment. Load ratings vary depending on boom angle, extension length, and outrigger position — consult the load chart posted in the cab for every lift configuration. Loads should be rigged by a qualified rigger. Ensure materials are evenly distributed and secured before lifting. Never carry workers on a material boom that is not rated and equipped for personnel lifts.

• Outrigger and Setup Requirements
Deploy all outriggers fully before any lift. Place outrigger pads on firm, level ground — never on soft soil, asphalt in hot weather, or unstable surfaces without blocking. Verify the machine is level before starting operations. Slopes and soft ground are a leading cause of tip-overs. Keep outrigger pads in the designated equipment kit — never leave the job site without them.

• Power Line Hazards
Maintain a minimum 10-foot clearance from power lines up to 50 kV. For higher voltages, clearances increase. Never position the boom where it could swing into a line. Before any lift near lines, contact the utility company to de-energize or establish a spotter assigned exclusively to monitoring proximity to lines. Electrocution from boom contact with power lines is a leading fatality cause.

• Ground Personnel and Exclusion Zones
No one may stand in the swing radius of the boom or beneath a suspended load at any time. Establish and enforce an exclusion zone around the machine during all lift operations. Ground workers must stay visible to the operator at all times. Use a signal person for blind lifts. Agree on hand signals before starting — use radio communication when visual contact is limited.

• Securing Loads on the Roof
When materials are placed on the roof, they must be immediately blocked, strapped, or positioned against a structural stop to prevent sliding. Never walk away from a load that has not been secured after the lift cables are released.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Boom Truck & Material Lift Safety'
);
