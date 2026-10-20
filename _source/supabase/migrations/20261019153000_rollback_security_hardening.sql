-- ====================================================================
-- SUPERTOURCHANNEL — RESTAURACIÓN DE EMERGENCIA AL ESTADO PREVIO (VULNERABLE)
-- ====================================================================
-- ⚠️ ADVERTENCIA CRÍTICA DE SEGURIDAD Y PRIVACIDAD ⚠️
-- Este script revierte la base de datos exactamente a las políticas originales
-- de las migraciones 20260522080000, 20260525162254 y 20260525165207.
-- 
-- RIESGOS QUE SE REABREN AL EJECUTAR ESTE SCRIPT:
-- 1. Fuga de Datos Personales (SEC-02): 'analytics_events' vuelve a ser de lectura
--    pública universal (nombres, correos y teléfonos expuestos a cualquier scraper anónimo).
-- 2. Falta de Control de Roles (SEC-04): Cualquier usuario con cuenta en auth.users
--    podrá modificar o borrar escuelas, fotos y encuestas sin verificar rol de administrador.
-- 3. Pérdida de Concurrencia en Encuestas: Las votaciones dependerán de escrituras
--    directas desde el cliente susceptibles a sobreescritura de votos.
--
-- Usar EXCLUSIVAMENTE si el sistema presenta una incompatibilidad bloqueante no recuperable.
-- ====================================================================

-- 1. Restaurar políticas originales en 'schools' (20260522080000)
DROP POLICY IF EXISTS "Allow verified admins to insert schools" ON public.schools;
DROP POLICY IF EXISTS "Allow verified admins to update schools" ON public.schools;
DROP POLICY IF EXISTS "Allow verified admins to delete schools" ON public.schools;
DROP POLICY IF EXISTS "Allow public read access to schools" ON public.schools;
DROP POLICY IF EXISTS "Allow authenticated admins all access to schools" ON public.schools;

CREATE POLICY "Allow public read access to schools" 
ON public.schools FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated admins all access to schools" 
ON public.schools FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. Restaurar políticas originales en 'gallery_photos' (20260522080000)
DROP POLICY IF EXISTS "Allow verified admins to insert gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow verified admins to update gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow verified admins to delete gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow public read access to gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow authenticated admins all access to gallery_photos" ON public.gallery_photos;

CREATE POLICY "Allow public read access to gallery_photos" 
ON public.gallery_photos FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated admins all access to gallery_photos" 
ON public.gallery_photos FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. Restaurar políticas originales en 'analytics_events' (20260525162254)
-- ⚠️ REABRE LECTURA PÚBLICA DE DATOS PERSONALES
DROP POLICY IF EXISTS "Allow only verified admins to read analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow verified admins to delete analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public insert to analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public read access to analytics_events" ON public.analytics_events;

CREATE POLICY "Allow public insert to analytics_events"
ON public.analytics_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public read access to analytics_events"
ON public.analytics_events FOR SELECT
USING (true);

-- 4. Restaurar políticas originales en 'surveys' (20260525162254)
DROP POLICY IF EXISTS "Allow public read access to active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated users to read surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to delete surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow public read access to surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated admins all access to surveys" ON public.surveys;

CREATE POLICY "Allow public read access to surveys"
ON public.surveys FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated admins all access to surveys"
ON public.surveys FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Restaurar políticas originales en 'supertour_settings' (20260525165207)
DROP POLICY IF EXISTS "Allow verified admins to manage settings" ON public.supertour_settings;
DROP POLICY IF EXISTS "Allow public read to settings" ON public.supertour_settings;
DROP POLICY IF EXISTS "Allow public read to public settings" ON public.supertour_settings;
DROP POLICY IF EXISTS "Allow authenticated admins all to settings" ON public.supertour_settings;

CREATE POLICY "Allow public read to settings" 
ON public.supertour_settings FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated admins all to settings" 
ON public.supertour_settings FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 6. Eliminar RPC y tabla de administradores
DROP FUNCTION IF EXISTS public.vote_survey_option(UUID, TEXT, INT);
DROP FUNCTION IF EXISTS public.is_admin();
DROP TABLE IF EXISTS public.admin_users CASCADE;
