-- Migration: Alter surveys table and create supertour_settings table
-- Date: 2026-05-25 16:52:07

-- 1. Alter surveys table to support Title, Description, and Answer Type
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS answer_type TEXT DEFAULT 'text' CHECK (answer_type IN ('text', 'number', 'boolean'));

-- Set default title/description to existing surveys (if any) to prevent nulls
UPDATE public.surveys 
SET 
  title = COALESCE(title, question),
  description = COALESCE(description, 'Por favor participá de esta breve encuesta del viaje de egresados.')
WHERE title IS NULL;

-- 2. Create supertour_settings table
CREATE TABLE IF NOT EXISTS public.supertour_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default n8n CRM webhook key
INSERT INTO public.supertour_settings (key, value) 
VALUES ('n8n_webhook_url', '') 
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.supertour_settings ENABLE ROW LEVEL SECURITY;

-- Allow public to select settings (enables passenger browser to read webhook url)
CREATE POLICY "Allow public read to settings" 
ON public.supertour_settings FOR SELECT 
USING (true);

-- Allow authenticated admin full access to settings
CREATE POLICY "Allow authenticated admins all to settings" 
ON public.supertour_settings FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
