-- Structured flight fields (replace single flight_details)
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS departure_date TEXT;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS departure_flight TEXT;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS return_date TEXT;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS return_flight TEXT;

-- Arrived phase settings
INSERT INTO settings (key, value) VALUES
  ('resort_map_url', ''),
  ('event_schedule', '[]')
ON CONFLICT (key) DO NOTHING;
