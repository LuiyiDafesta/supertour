-- Migration: Add multi-school columns to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS group_code TEXT,
ADD COLUMN IF NOT EXISTS school_names TEXT[],
ADD COLUMN IF NOT EXISTS school_items JSONB;
