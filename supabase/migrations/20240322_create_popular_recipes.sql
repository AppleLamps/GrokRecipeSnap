-- Create popular_recipes table
CREATE TABLE IF NOT EXISTS popular_recipes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  content text NOT NULL,
  ingredients text[] DEFAULT '{}',
  instructions text[] DEFAULT '{}',
  image_url text,
  cook_time text DEFAULT '30 mins',
  servings integer DEFAULT 4,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  popularity_score integer DEFAULT 0,
  tags text[] DEFAULT '{}'
);

-- Create index on popularity_score for faster sorting
CREATE INDEX IF NOT EXISTS popular_recipes_popularity_score_idx ON popular_recipes (popularity_score DESC); 