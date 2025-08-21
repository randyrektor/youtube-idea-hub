-- Database Schema Update: Remove unused columns
-- Run this in your Supabase SQL Editor

-- Remove the lift_level and content_type columns from the ideas table
ALTER TABLE public.ideas DROP COLUMN IF EXISTS lift_level;
ALTER TABLE public.ideas DROP COLUMN IF EXISTS content_type;

-- Verify the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ideas' 
AND table_schema = 'public'
ORDER BY ordinal_position;
