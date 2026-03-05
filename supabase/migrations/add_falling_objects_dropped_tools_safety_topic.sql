-- Add Falling Objects & Dropped Tools Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Falling Objects & Dropped Tools',
  'Material Handling & Struck-By',
  'OSHA 29 CFR 1926.502(j)',
  'Struck-by incidents involving falling objects are among the top four causes of construction fatalities. On roofing and exterior siding jobs, workers on the ground and in lower areas are constantly at risk from tools, fasteners, scrap materials, and shingles dropped or kicked from above. A single nail gun or hammer falling from a two-story roof generates enough energy to cause fatal head trauma. Prevention requires a combination of controlled work areas, proper tool management, and PPE for ground-level workers.

• Controlled Access Zones and Overhead Hazard Areas
Establish a controlled access zone directly below and around all elevated work. Barricade the area with hard barriers — cones alone are not sufficient when overhead work is in progress. Post clear signage: "OVERHEAD WORK — HARD HAT AREA." No unauthorized personnel should be allowed to stand or walk under work being performed at height. Ensure homeowners, inspectors, and delivery drivers are made aware of and kept out of overhead hazard zones.

• Toeboards and Debris Nets
Install toeboards on all elevated work platforms where tools, fasteners, or materials could roll or slide off the edge. Toeboards must be at least 3.5 inches high. Where toeboards alone cannot contain the hazard (e.g., removal of old shingles, mass debris generation), debris nets or screens must be installed beneath the work area or at the perimeter.

• Tool Tethering
Every tool used at height must be tethered to the worker or work platform with a tool lanyard rated for the weight and drop distance involved. This includes hammers, pry bars, drills, screw guns, and nail guns. Never set a tool on the roof edge or on a sloped surface where it can slide. Establish a designated drop zone for passing tools up and down — never throw tools between workers on a roof.

• Material Staging and Control
Do not stage materials near roof edges. Shingles, bundles, rolls of felt, and sheet material must be positioned away from the edge and secured against wind displacement. During tear-off operations, old shingles must be directed into a covered chute or dumpster — never thrown freely from the roof over workers or occupied areas.

• Personal Protective Equipment for Ground Workers
All workers on the ground within the overhead hazard zone must wear hard hats meeting ANSI/ISEA Z89.1 Type I or Type II standards. Safety glasses with side shields provide additional protection against small debris. Anyone who must enter the hazard zone — even briefly — must have PPE on before entering. Visitors and homeowners must be issued hard hats or kept out.

• Communication Between Levels
Establish clear communication signals between workers on the roof and those on the ground. Before dropping, releasing, or pushing any material off the roof edge, the ground must be cleared and confirmed clear. Use verbal or radio communication — never assume someone has moved. Designate a ground person when overhead work is actively in progress.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Falling Objects & Dropped Tools'
);
