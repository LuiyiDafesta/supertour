-- Migration: Create analytics_events and surveys tables
-- Date: 2026-05-25 16:22:54

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN ('calendar_click', 'school_view', 'photo_click', 'photo_download', 'survey_vote')),
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    destination TEXT CHECK (destination IN ('Mar del Plata', 'Villa Carlos Paz')),
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create surveys table
CREATE TABLE IF NOT EXISTS public.surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb NOT NULL, -- Array of objects: { "text": string, "votes": number }
    active BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- 1. Allow public to INSERT telemetry (any visitor should be able to log event)
CREATE POLICY "Allow public insert to analytics_events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);

-- 2. Allow public to SELECT telemetry (enables operator dashboards & public aggregations)
CREATE POLICY "Allow public read access to analytics_events"
ON public.analytics_events FOR SELECT
USING (true);

-- 3. Allow public to SELECT active surveys
CREATE POLICY "Allow public read access to surveys"
ON public.surveys FOR SELECT
USING (true);

-- 4. Allow authenticated admins ALL access to surveys
CREATE POLICY "Allow authenticated admins all access to surveys"
ON public.surveys FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
