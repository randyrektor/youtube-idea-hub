-- Database Schema Update for YouTube Idea Hub
-- This file contains the SQL commands to update the existing database schema

-- Update the status constraint to allow 'ready' status
-- First, drop the existing constraint
ALTER TABLE public.ideas DROP CONSTRAINT IF EXISTS ideas_status_check;

-- Add the new constraint that includes 'ready'
ALTER TABLE public.ideas ADD CONSTRAINT ideas_status_check 
  CHECK (status IN ('idea', 'in-progress', 'ready', 'completed', 'archived'));

-- Update any existing ideas that might have invalid status values
-- (This shouldn't be necessary but is a safety measure)
UPDATE public.ideas 
SET status = 'idea' 
WHERE status NOT IN ('idea', 'in-progress', 'ready', 'completed', 'archived');

-- Verify the constraint was applied
-- You can run this to check: SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE table_name = 'ideas';
