-- Run this in your Supabase SQL Editor to add the missing column for Daily Limit
ALTER TABLE employees ADD COLUMN IF NOT EXISTS daily_meal_limit DECIMAL(10, 2) DEFAULT 0;
