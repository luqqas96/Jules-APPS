-- Supabase Schema Phase 3 (Normalization)

-- 1. Table for Individual Food Logs
CREATE TABLE IF NOT EXISTS food_logs (
  id text PRIMARY KEY, -- We'll use the short string ID from the app
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  date text NOT NULL,
  time text NOT NULL,
  meal_type text NOT NULL,
  product_name text NOT NULL,
  amount numeric NOT NULL,
  protein numeric NOT NULL,
  carbs numeric NOT NULL,
  fats numeric NOT NULL,
  calories numeric NOT NULL,
  cholesterol numeric DEFAULT 0,
  sodium numeric DEFAULT 0,
  sugar numeric DEFAULT 0,
  calcium numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Table for Daily Weights
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile text REFERENCES user_settings(profile) ON DELETE CASCADE,
  date text NOT NULL,
  weight numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile, date)
);

-- Row Level Security (RLS)
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on food_logs" ON food_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on weight_logs" ON weight_logs FOR ALL USING (true) WITH CHECK (true);
