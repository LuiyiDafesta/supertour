-- Migration: Add group_code and school_names to schools table
-- Date: 2026-08-04

ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS group_code TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS school_names TEXT[] DEFAULT '{}';
