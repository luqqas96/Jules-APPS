-- Supabase Schema Phase 2 for Jules Diet Tracker

-- 1. Table for Fitness Progress
CREATE TABLE IF NOT EXISTS fitness_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  date text NOT NULL,
  category text NOT NULL,
  exercise text NOT NULL,
  sets integer NOT NULL,
  reps integer NOT NULL,
  weight numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS)
ALTER TABLE fitness_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on fitness_progress" ON fitness_progress FOR ALL USING (true) WITH CHECK (true);
