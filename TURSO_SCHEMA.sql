-- Turso SQLite Database Schema

CREATE TABLE IF NOT EXISTS auth_otps (
  email TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  email TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  cet_rank INTEGER,
  dcet_score REAL,
  exam_score REAL,
  courses TEXT,
  favorites TEXT,
  is_verified INTEGER DEFAULT 1,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS colleges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  place TEXT,
  location_address TEXT,
  details TEXT,
  contact_number TEXT,
  website TEXT,
  video_url TEXT,
  images TEXT,
  courses TEXT,
  type TEXT,
  established INTEGER,
  rating REAL,
  created_at TEXT
);
