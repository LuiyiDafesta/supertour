-- Migración: Agregar columna videos (JSONB) para permitir 0 o múltiples videos por grupo de viaje
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]'::jsonb;
