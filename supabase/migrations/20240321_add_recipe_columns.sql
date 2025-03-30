-- Add missing columns to recipes table
ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS cook_time text,
ADD COLUMN IF NOT EXISTS servings integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS image_url text;

-- Update existing rows with default values
UPDATE recipes
SET 
  cook_time = '30 mins',
  servings = 4,
  tags = '{}',
  image_url = 'https://via.placeholder.com/400'
WHERE cook_time IS NULL; 