-- Household-level fields
ALTER TABLE guests ADD COLUMN IF NOT EXISTS plus_one_allowed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS rsvp_submitted_at TIMESTAMPTZ;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS passport_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS flights_booked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS flight_details TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS hotel_booked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS hotel_in_room_block BOOLEAN;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS transport_needed BOOLEAN;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS arrival_date TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS departure_date TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS song_request TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS message_to_couple TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS checklist_submitted_at TIMESTAMPTZ;

-- Member-level fields
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS is_plus_one BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS rsvp_status VARCHAR(20);
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS food_choice VARCHAR(64);
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS food_allergies TEXT;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS attending_welcome BOOLEAN;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS attending_ceremony BOOLEAN;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS attending_reception BOOLEAN;
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS attending_brunch BOOLEAN;

-- Settings
INSERT INTO settings (key, value) VALUES
  ('guest_page_phase', 'save_the_date'),
  ('global_video_url', ''),
  ('room_block_link', '')
ON CONFLICT (key) DO NOTHING;
