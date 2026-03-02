-- Add Deck Framing & Structural Load Awareness safety topic
INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Deck Framing & Structural Load Awareness',
  'Structural Safety',
  'OSHA 29 CFR 1926.502',
  'Deck framing failures are among the most preventable structural collapses in residential construction. The majority of deck failures — collapses, ledger separations, and post failures — result from improper fastening, undersized components, or inadequate connections to the primary structure. A deck that looks solid can fail suddenly and without warning under occupancy load. Every framing decision made during construction determines whether the deck is safe for the life of the structure.

• Design Review and Documentation
Deck design and load requirements must be reviewed before construction begins. Structural drawings must be available on site wherever required by the permit or project scope. Required live and dead loads must be understood before any component is sized or fastened. Using undersized members or skipping engineered specifications to save time or materials is a leading cause of deck collapse.

• Ledger Board Connection
The ledger board attachment method must be verified before installation — the ledger is the single most critical connection on an attached deck. The ledger must be fastened directly to the structural rim joist or band joist of the primary structure, never to siding, sheathing, or non-structural cladding alone. Proper flashing must be installed at the ledger connection to prevent water intrusion, rot, and long-term structural degradation. Fasteners must be sized and spaced per design specifications — under-fastened ledgers are the most common cause of catastrophic deck separation.

• Framing Members
Joist spacing must be verified before decking installation begins. Joists must be inspected for damage, excessive warping, or defects that compromise load capacity. Beam size and span must be verified against the plan — beams that are undersized for their span will deflect, crack, or fail under load. Posts must be properly sized and rated for the tributary load they carry. Post bases must be installed and secured to footings — post bases that are improperly anchored allow posts to shift laterally and can cause progressive collapse.

• Footings and Foundation
Concrete footings must be fully cured and inspected before any structural load is applied. Soil conditions must be evaluated before footing installation — soft, fill, or expansive soils require deeper or wider footings than standard residential practice. Temporary shoring must be installed wherever required to support the structure during construction before permanent connections are complete.

• Load Control During Construction
The partially framed structure must not be overloaded at any point during construction. Materials must be distributed evenly across framing members — concentrated loads from stacked lumber, concrete blocks, or equipment can overload individual joists or beams before the system is complete. Workers must avoid standing on unsupported joists; a single joist without blocking or adjacent framing is not designed for point loading from foot traffic.

• Fall Protection
Fall protection must be used whenever deck height requires it. Guardrail posts must be installed and properly secured before the guardrail system is relied upon — a guardrail post that is inadequately fastened provides no protection in a fall arrest scenario. Stair stringers must be properly supported and secured before use. Stair rise and run must be consistent and compliant with applicable code to prevent trips and missteps.

• Material Staging and Tools
Tools and materials must be staged away from deck edges to prevent rolling or sliding falls. Power tools must be inspected before use for structural fastening operations. Fasteners must be appropriate for pressure-treated lumber — standard bright fasteners corrode rapidly in contact with the preservative chemicals in treated wood and will fail over time. All hardware, hangers, and connectors must be corrosion-resistant where required by the design and material specifications.

• Lateral Bracing and Final Inspection
Lateral bracing must be installed per design to prevent racking of the post and beam system. A structure that is plumb and square under its own weight can shift and collapse under dynamic or lateral loads if bracing is absent. Final framing must be inspected before any decking surface is installed — once the decking is in place, access to framing connections for inspection is significantly reduced.

• Weather and Stop-Work Authority
Weather conditions must be monitored during structural installation — wet lumber dimensions change with moisture content, and connections made to saturated lumber may loosen as the material dries and shrinks. Stop-work authority must be reinforced with the entire crew: if any sign of structural instability is observed during framing — unexpected deflection, cracking sounds, post movement, or footing settlement — work must stop immediately and the condition must be assessed before proceeding.

Remember: A deck supports people. It must be built as if its failure would be fatal — because deck collapse under occupancy load regularly is. Follow the design, use the correct fasteners, make every connection to structure, and never assume a framing member is adequate without verifying it.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Deck Framing & Structural Load Awareness'
);
