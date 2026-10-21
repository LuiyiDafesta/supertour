-- Migration: Permitir 'banner_click' en la restricción CHECK de analytics_events
-- Date: 2026-10-21 12:30:00

ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_type_check;

ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_event_type_check 
CHECK (event_type IN ('calendar_click', 'school_view', 'photo_click', 'photo_download', 'survey_vote', 'banner_click'));
