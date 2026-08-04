-- Migration: Add school_items column (JSONB) to schools table
-- Date: 2026-08-04

ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS school_items JSONB DEFAULT '[]'::jsonb;
