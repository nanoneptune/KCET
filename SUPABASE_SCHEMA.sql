-- Run this in your Supabase SQL Editor

-- 1. Create Colleges Table
CREATE TABLE IF NOT EXISTS public.colleges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    logo TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    "cetCutoff" INTEGER,
    courses JSONB DEFAULT '[]'::jsonb,
    description TEXT,
    stats JSONB DEFAULT '{}'::jsonb,
    website TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Profiles Table (for Students)
CREATE TABLE IF NOT EXISTS public.profiles (
    email TEXT PRIMARY KEY,
    name TEXT,
    cet_rank INTEGER,
    category TEXT,
    interested_courses JSONB DEFAULT '[]'::jsonb,
    favorites JSONB DEFAULT '[]'::jsonb,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allowing public read for colleges and authenticated access for profiles)
-- Note: In a production app, you would refine these further.
CREATE POLICY "Allow public read access to colleges" ON public.colleges FOR SELECT USING (true);
CREATE POLICY "Allow authenticated upsert to colleges" ON public.colleges FOR ALL USING (true);

-- 3. Create OTP Storage Table (Required for Vercel/Serverless persistence)
CREATE TABLE IF NOT EXISTS public.auth_otps (
    email TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for OTP table
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;

-- Allow service role/authenticated upsert (Server-side only)
CREATE POLICY "Allow server-side access to OTPs" ON public.auth_otps FOR ALL USING (true);
