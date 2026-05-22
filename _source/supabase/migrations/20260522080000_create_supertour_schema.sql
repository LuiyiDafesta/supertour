-- Create schools table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT NOT NULL CHECK (destination IN ('Mar del Plata', 'Villa Carlos Paz')),
    travel_date DATE NOT NULL,
    group_photo_web TEXT NOT NULL,
    group_photo_hd TEXT NOT NULL,
    multimedia_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create gallery_photos table
CREATE TABLE IF NOT EXISTS public.gallery_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    url_web TEXT NOT NULL,
    url_hd TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Excursiones', 'Fiestas', 'Actividades', 'Grupal')),
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for schools
-- 1. Allow public select access
CREATE POLICY "Allow public read access to schools" 
ON public.schools FOR SELECT 
USING (true);

-- 2. Allow authenticated admin write access
CREATE POLICY "Allow authenticated admins all access to schools" 
ON public.schools FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create RLS Policies for gallery_photos
-- 1. Allow public select access
CREATE POLICY "Allow public read access to gallery_photos" 
ON public.gallery_photos FOR SELECT 
USING (true);

-- 2. Allow authenticated admin write access
CREATE POLICY "Allow authenticated admins all access to gallery_photos" 
ON public.gallery_photos FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Enable public storage bucket for schools-gallery
-- Note: Run this in Supabase Storage or create it manually via dashboard
-- Name: schools-gallery
-- Public: true
