-- Per-member travel checklist fields
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS passport_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS flights_booked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS flight_details TEXT;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS hotel_booked BOOLEAN NOT NULL DEFAULT FALSE;

-- New settings
INSERT INTO settings (key, value) VALUES
  ('destination_airport', 'CUN'),
  ('travel_date_start', '2027-02-25'),
  ('travel_date_end', '2027-02-28'),
  ('food_options', 'Salmon,Chicken Fettuccine')
ON CONFLICT (key) DO NOTHING;
