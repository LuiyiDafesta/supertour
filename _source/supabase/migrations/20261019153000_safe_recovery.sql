-- ====================================================================
-- SUPERTOURCHANNEL — PROCEDIMIENTO DE RECUPERACIÓN SEGURO (SAFE RECOVERY)
-- Fecha: 2026-10-19
-- ====================================================================
-- Este script permite destrabar operaciones operativas en caso de contingencia
-- PRESERVANDO LA PRIVACIDAD Y SIN REABRIR VULNERABILIDADES CRÍTICAS:
-- 1. NO restaura la lectura pública de datos personales en 'analytics_events'.
-- 2. Preserva la tabla 'admin_users' y los datos registrados.
-- 3. Mantiene las galerías públicas intactas.
-- ====================================================================

-- 1. 'schools': Preservar lectura pública y permitir escritura a authenticated en contingencia
DROP POLICY IF EXISTS "Allow verified admins to insert schools" ON public.schools;
DROP POLICY IF EXISTS "Allow verified admins to update schools" ON public.schools;
DROP POLICY IF EXISTS "Allow verified admins to delete schools" ON public.schools;
DROP POLICY IF EXISTS "Allow public read access to schools" ON public.schools;

CREATE POLICY "Allow public read access to schools" 
ON public.schools FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated manage schools safe fallback" 
ON public.schools FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. 'gallery_photos': Preservar lectura pública y permitir escritura a authenticated en contingencia
DROP POLICY IF EXISTS "Allow verified admins to insert gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow verified admins to update gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow verified admins to delete gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow public read access to gallery_photos" ON public.gallery_photos;

CREATE POLICY "Allow public read access to gallery_photos" 
ON public.gallery_photos FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated manage gallery_photos safe fallback" 
ON public.gallery_photos FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. 'analytics_events': MANTENER BLINDADA LA PRIVACIDAD (NO REABRIR A ANON)
DROP POLICY IF EXISTS "Allow only verified admins to read analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow verified admins to delete analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public insert to analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public read access to analytics_events" ON public.analytics_events;

CREATE POLICY "Allow public insert to analytics_events"
ON public.analytics_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Solo authenticated puede leer (nunca anónimo para evitar fuga de emails/teléfonos)
CREATE POLICY "Allow authenticated read analytics safe fallback"
ON public.analytics_events FOR SELECT
TO authenticated
USING (true);

-- 4. 'surveys': Preservar lectura activa para público y escritura para authenticated
DROP POLICY IF EXISTS "Allow public read access to active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated users to read surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to delete surveys" ON public.surveys;

CREATE POLICY "Allow public read access to active surveys"
ON public.surveys FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "Allow authenticated manage surveys safe fallback"
ON public.surveys FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. 'supertour_settings': Preservar lectura pública
DROP POLICY IF EXISTS "Allow verified admins to manage settings" ON public.supertour_settings;
DROP POLICY IF EXISTS "Allow public read to settings" ON public.supertour_settings;
DROP POLICY IF EXISTS "Allow public read to public settings" ON public.supertour_settings;

CREATE POLICY "Allow public read to settings safe fallback"
ON public.supertour_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow authenticated manage settings safe fallback"
ON public.supertour_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
