-- Migration: Add questions column to surveys table to support multi-question surveys
-- Date: 2026-05-25 17:15:00

ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;

-- Populate questions column for existing surveys if any
UPDATE public.surveys 
SET questions = jsonb_build_array(
  jsonb_build_object(
    'id', 'q-1',
    'question', question,
    'answer_type', COALESCE(answer_type, 'text')
  )
)
WHERE questions IS NULL OR jsonb_array_length(questions) = 0;
