-- Seed the trades table from all existing trade values on both tables
-- ON CONFLICT DO NOTHING ensures idempotency; safe to run multiple times
INSERT INTO trades (name)
SELECT DISTINCT trade
FROM (
  SELECT unnest(trades) AS trade
  FROM safety_topics
  WHERE trades IS NOT NULL AND array_length(trades, 1) > 0

  UNION

  SELECT unnest(trades) AS trade
  FROM checklists
  WHERE trades IS NOT NULL AND array_length(trades, 1) > 0
) combined
WHERE trade IS NOT NULL AND trim(trade) <> ''
ON CONFLICT (name) DO NOTHING;
