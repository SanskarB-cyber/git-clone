-- Add filename column to commits table if it doesn't exist
-- Run this in your Supabase SQL editor

ALTER TABLE commits 
ADD COLUMN IF NOT EXISTS filename VARCHAR(500) DEFAULT 'unknown.txt';

-- This adds the column with a default value so existing commits show 'unknown.txt'
-- Future commits will include the actual filename
