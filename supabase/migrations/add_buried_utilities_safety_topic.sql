-- Add Buried Utilities Safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Buried Utilities',
  'Electrical Hazards',
  'OSHA 29 CFR 1926.651(b); CGA Best Practices',
  'Striking a buried utility is one of the fastest ways to turn a routine job into a fatality. Underground electrical lines, gas lines, water mains, and communication cables run beneath virtually every residential and commercial property. In exterior construction and roofing, buried utility strikes happen during post driving for temporary fencing, ground anchor installation, excavation for drainage or downspout discharge, dumpster placement, and even shallow staking. One strike can electrocute workers instantly, ignite a gas explosion, or deprive a neighborhood of essential services. Call 811 before any ground disturbance — no exceptions.

• The Law: Call 811 Before You Dig
In the United States, federal law (and state law in all 50 states) requires anyone planning to dig to call 811 (or submit an online locate request) at least 2–3 business days before excavation. This applies to ANY ground disturbance — including shallow work. Calling 811 is free. Striking a utility without having called carries significant fines and liability. This requirement applies to subcontractors and specialty trades, not just the GC.

• What 811 Does and Does Not Cover
Your 811 call initiates a locate request that prompts all utility owners in the area to mark their lines with color-coded paint or flags. However: utility owners are not required to mark private service lines (lines from the meter to the structure on private property). These private lines — especially gas and electric — are among the most frequently struck. Before digging anywhere near a structure, ask the property owner about private service locations and check with your state''s one-call program for guidance on private line locating.

• Understanding Utility Marking Colors
APWA standard colors: Red = electric power; Yellow = gas, oil, steam, petroleum; Orange = communication, alarm, signal; Blue = potable water; Purple = reclaimed water, irrigation; Pink = temporary survey marking; White = proposed excavation area. Mark the tolerance zone (typically 18–24 inches each side of the marked line) and hand-dig within that zone only.

• Safe Digging Within the Tolerance Zone
Even with marks in place, use hand tools within 18–24 inches of any marked line (the exact distance varies by state). Never use powered mechanical equipment within the tolerance zone. Expose the utility by hand to confirm exact depth and position before bringing in mechanical equipment.

• When to Stop and Reassess
If at any time you encounter an unmarked line, utility debris, or unusual smell (gas) during any ground work: stop immediately. Back all equipment away. For gas odors: evacuate the area, keep ignition sources away, and call 911 and the gas company. Do not re-enter the area until the utility company has cleared it.

• Documentation
Keep a copy of your 811 ticket number on site. Know the marked locate ticket expiration date — marks expire and require renewal if work extends beyond the ticket''s validity period. Document the locate process as part of your site safety file.',
  'critical'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Buried Utilities'
);
