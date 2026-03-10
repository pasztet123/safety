-- Add Perimeter Warning Flags & Barriers safety topic and checklist

INSERT INTO safety_topics (name, category, osha_reference, description, risk_level)
SELECT
  'Perimeter Warning Flags & Barriers',
  'Fall & Height Hazards',
  'OSHA 29 CFR 1926.502(f)',
  'Warning flags, warning lines, and temporary barriers mark no-go areas near roof edges and openings before work starts. They must be visible, correctly set back, and kept in place for the full task. They do not replace required fall arrest when workers must cross the line or work outside the protected zone. Daily inspection and immediate correction of damaged or moved barriers are essential to prevent falls and dropped-object exposure.',
  'high'
WHERE NOT EXISTS (
  SELECT 1 FROM safety_topics WHERE name = 'Perimeter Warning Flags & Barriers'
);


WITH seed_user AS (
  SELECT id
  FROM users
  ORDER BY created_at NULLS LAST, id
  LIMIT 1
)
INSERT INTO checklists (name, category, description, created_by, updated_by)
SELECT
  'Perimeter Warning Flags & Barriers',
  'Fall & Height Hazards',
  'Quick verification that warning flags and barriers are correctly installed, visible, and respected before roof-edge or opening work begins.',
  seed_user.id,
  seed_user.id
FROM seed_user
WHERE NOT EXISTS (
  SELECT 1 FROM checklists WHERE name = 'Perimeter Warning Flags & Barriers'
);


DO $$
DECLARE
  checklist_uuid UUID;
  item_text TEXT;
  idx INTEGER := 1;
  checklist_items_text TEXT[] := ARRAY[
    'Is the warning line or barrier set back at the correct distance from the roof edge or opening?',
    'Are flags, posts, and connecting lines visible, continuous, and securely supported?',
    'Are barrier height and sag acceptable so the line remains easy to see and respect?',
    'Are entry points to the protected area limited and clearly identified?',
    'Are workers staying inside the protected side unless additional fall protection is in place?',
    'Are materials, cords, and debris kept clear so they do not pull down or hide the barrier?',
    'Are skylights, holes, and other openings protected separately and not relying only on flags?',
    'Is the area below the edge protected from falling tools or material?',
    'Has the crew been reminded not to move or cross the barrier without authorization?',
    'Has the barrier been rechecked after wind, material movement, or a change in the work area?'
  ];
BEGIN
  SELECT id
  INTO checklist_uuid
  FROM checklists
  WHERE name = 'Perimeter Warning Flags & Barriers'
  ORDER BY id
  LIMIT 1;

  IF checklist_uuid IS NULL OR EXISTS (
    SELECT 1
    FROM checklist_items
    WHERE checklist_id = checklist_uuid
  ) THEN
    RETURN;
  END IF;

  FOREACH item_text IN ARRAY checklist_items_text
  LOOP
    INSERT INTO checklist_items (checklist_id, title, display_order, is_section_header)
    VALUES (checklist_uuid, item_text, idx, false);

    idx := idx + 1;
  END LOOP;
END
$$;


DO $$
DECLARE
  topic_uuid UUID;
  checklist_uuid UUID;
BEGIN
  IF to_regclass('public.topic_checklist_suggestions') IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO topic_uuid
  FROM safety_topics
  WHERE name = 'Perimeter Warning Flags & Barriers'
  ORDER BY id
  LIMIT 1;

  SELECT id INTO checklist_uuid
  FROM checklists
  WHERE name = 'Perimeter Warning Flags & Barriers'
  ORDER BY id
  LIMIT 1;

  IF topic_uuid IS NULL OR checklist_uuid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO topic_checklist_suggestions (topic_id, checklist_id)
  SELECT topic_uuid, checklist_uuid
  WHERE NOT EXISTS (
    SELECT 1
    FROM topic_checklist_suggestions
    WHERE topic_id = topic_uuid
      AND checklist_id = checklist_uuid
  );
END
$$;