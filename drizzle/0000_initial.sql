CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(128) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip VARCHAR(20),
  country TEXT,
  link_sent_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  address_submitted_at TIMESTAMPTZ,
  calendar_saved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(128) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings
INSERT INTO settings (key, value) VALUES
  ('global_note', ''),
  ('reminder_threshold_days', '7'),
  ('couple_names', 'Nathan & Lauren'),
  ('wedding_date', '2027-02-27'),
  ('venue_name', 'Cancún, Mexico'),
  ('venue_detail', 'All-inclusive resort · details to follow')
ON CONFLICT (key) DO NOTHING;
