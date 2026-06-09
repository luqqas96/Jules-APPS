-- Supabase Schema for Jules Diet Tracker

-- 1. Table for User Settings & Profiles
CREATE TABLE IF NOT EXISTS user_settings (
  profile text PRIMARY KEY, -- 'Lucas', 'Agustin', 'Mariano'
  goals jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats jsonb
);

-- Insert default profiles if they don't exist
INSERT INTO user_settings (profile, goals) VALUES
  ('Lucas', '{"calories": 2000, "protein": 150, "carbs": 200, "fats": 65}'::jsonb),
  ('Agustin', '{"calories": 2000, "protein": 150, "carbs": 200, "fats": 65}'::jsonb),
  ('Mariano', '{"calories": 2000, "protein": 150, "carbs": 200, "fats": 65}'::jsonb)
ON CONFLICT (profile) DO NOTHING;

-- 2. Table for Daily Logs (The main source of truth)
CREATE TABLE IF NOT EXISTS daily_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  date text NOT NULL, -- Format: YYYY-MM-DD
  data jsonb NOT NULL, -- Contains meals and weight
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile, date)
);

-- 3. Table for Food History (Used for text search)
CREATE TABLE IF NOT EXISTS food_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  name text NOT NULL,
  base_macros jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile, name)
);

-- Row Level Security (RLS)
-- For this personal app without auth, we allow public read/write to these tables.
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE daily_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on daily_data" ON daily_data FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE food_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on food_history" ON food_history FOR ALL USING (true) WITH CHECK (true);
