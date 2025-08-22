-- Database Migration: Add lift_level and content_type columns
-- Run this on your live Supabase database

-- Add the missing columns to the existing ideas table
ALTER TABLE public.ideas 
ADD COLUMN IF NOT EXISTS lift_level TEXT DEFAULT 'Mid Lift',
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'Build/Tutorial';

-- Update existing ideas to have the default values
UPDATE public.ideas 
SET 
  lift_level = COALESCE(lift_level, 'Mid Lift'),
  content_type = COALESCE(content_type, 'Build/Tutorial')
WHERE lift_level IS NULL OR content_type IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'ideas' 
AND column_name IN ('lift_level', 'content_type');
