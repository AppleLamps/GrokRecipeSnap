-- Add macros columns to popular_recipes table
ALTER TABLE popular_recipes
ADD COLUMN IF NOT EXISTS macros JSONB DEFAULT NULL;

-- Add macros columns to recipes table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipes') THEN
        ALTER TABLE recipes
        ADD COLUMN IF NOT EXISTS macros JSONB DEFAULT NULL;
    END IF;
END $$;
