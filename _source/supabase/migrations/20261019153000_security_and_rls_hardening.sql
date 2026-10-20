-- ====================================================================
-- SUPERTOURCHANNEL — MIGRACIÓN DE SEGURIDAD, AUTORIZACIÓN Y RLS (LOTE 2)
-- Fecha: 2026-10-19 15:30:00 (Revisión 2.2)
-- ====================================================================

-- 1. TABLA DE ADMINISTRADORES EXPLÍCITOS
-- Impide que usuarios regulares se auto-promuevan o modifiquen roles en Supabase.
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Revocación explícita de privilegios a nivel de tabla SQL para blindar contra inserciones no autorizadas:
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_users FROM anon;
REVOKE ALL ON TABLE public.admin_users FROM authenticated;

-- Concesión explícita únicamente de SELECT para 'authenticated' (filtrado estrictamente por RLS):
GRANT SELECT ON TABLE public.admin_users TO authenticated;

-- Los usuarios autenticados únicamente pueden consultar si su propio UID está en admin_users:
DROP POLICY IF EXISTS "Allow authenticated users to check own admin status" ON public.admin_users;
CREATE POLICY "Allow authenticated users to check own admin status"
ON public.admin_users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- NOTA DE SEGURIDAD Y PRIVACIDAD:
-- NO se crean políticas de INSERT/UPDATE/DELETE para 'authenticated' ni 'anon'.
-- La inserción o remoción de administradores solo puede realizarse vía service_role / consola SQL de Supabase.
-- NO se promueve automáticamente a ningún usuario de auth.users sin autorización explícita del propietario.
--
-- INSTRUCCIÓN PARA EL PROPIETARIO / DBA TRAS APLICAR ESTA MIGRACIÓN:
-- Para habilitar a un administrador, ejecute manualmente en la consola SQL de Supabase:
-- INSERT INTO public.admin_users (id, email)
-- SELECT id, email FROM auth.users WHERE email = 'EMAIL_DEL_ADMINISTRADOR_AUTORIZADO'
-- ON CONFLICT (id) DO NOTHING;

-- 2. FUNCIÓN HELPER DE AUTORIZACIÓN 'is_admin()'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 3. POLÍTICAS RLS EN 'schools'
-- Preserva lectura pública para el frontend de pasajeros, pero restringe escrituras a administradores verificados.
DROP POLICY IF EXISTS "Allow authenticated admins all access to schools" ON public.schools;
DROP POLICY IF EXISTS "Allow public read access to schools" ON public.schools;
DROP POLICY IF EXISTS "Allow verified admins to insert schools" ON public.schools;
DROP POLICY IF EXISTS "Allow verified admins to update schools" ON public.schools;
DROP POLICY IF EXISTS "Allow verified admins to delete schools" ON public.schools;

CREATE POLICY "Allow public read access to schools" 
ON public.schools FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Allow verified admins to insert schools" 
ON public.schools FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

CREATE POLICY "Allow verified admins to update schools" 
ON public.schools FOR UPDATE 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

CREATE POLICY "Allow verified admins to delete schools" 
ON public.schools FOR DELETE 
TO authenticated 
USING (public.is_admin());

-- 4. POLÍTICAS RLS EN 'gallery_photos'
-- Preserva lectura pública para fotos, pero restringe escrituras a administradores verificados.
DROP POLICY IF EXISTS "Allow authenticated admins all access to gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow public read access to gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow verified admins to insert gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow verified admins to update gallery_photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Allow verified admins to delete gallery_photos" ON public.gallery_photos;

CREATE POLICY "Allow public read access to gallery_photos" 
ON public.gallery_photos FOR SELECT 
TO anon, authenticated
USING (true);

CREATE POLICY "Allow verified admins to insert gallery_photos" 
ON public.gallery_photos FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

CREATE POLICY "Allow verified admins to update gallery_photos" 
ON public.gallery_photos FOR UPDATE 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

CREATE POLICY "Allow verified admins to delete gallery_photos" 
ON public.gallery_photos FOR DELETE 
TO authenticated 
USING (public.is_admin());

-- 5. POLÍTICAS RLS EN 'analytics_events' (REVOCACIÓN DE FUGA DE PRIVACIDAD)
-- Los pasajeros pueden registrar eventos validados, pero NINGÚN usuario anónimo puede leer datos personales.
DROP POLICY IF EXISTS "Allow public read access to analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow public insert to analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow only verified admins to read analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow verified admins to delete analytics_events" ON public.analytics_events;

CREATE POLICY "Allow public insert to analytics_events"
ON public.analytics_events FOR INSERT
TO anon, authenticated
WITH CHECK (
    -- Validación de tamaño: máximo 10 KB por payload en metadata para prevenir ataques de denegación de servicio
    length(metadata::text) <= 10240
    AND (school_id IS NULL OR EXISTS (SELECT 1 FROM public.schools WHERE id = school_id))
);

CREATE POLICY "Allow only verified admins to read analytics_events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Allow verified admins to delete analytics_events"
ON public.analytics_events FOR DELETE
TO authenticated
USING (public.is_admin());

-- 6. POLÍTICAS RLS EN 'surveys'
-- Anónimos solo ven encuestas activas. Solo administradores verificados pueden gestionar encuestas.
DROP POLICY IF EXISTS "Allow authenticated admins all access to surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow public read access to surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow public read access to active surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow authenticated users to read surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to update surveys" ON public.surveys;
DROP POLICY IF EXISTS "Allow verified admins to delete surveys" ON public.surveys;

CREATE POLICY "Allow public read access to active surveys"
ON public.surveys FOR SELECT
TO anon
USING (active = true);

CREATE POLICY "Allow authenticated users to read surveys"
ON public.surveys FOR SELECT
TO authenticated
USING (public.is_admin() OR active = true);

CREATE POLICY "Allow verified admins to insert surveys"
ON public.surveys FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Allow verified admins to update surveys"
ON public.surveys FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Allow verified admins to delete surveys"
ON public.surveys FOR DELETE
TO authenticated
USING (public.is_admin());

-- 7. POLÍTICAS RLS EN 'supertour_settings'
-- Separa claves públicas de visualización de claves privadas (n8n_webhook_url).
DROP POLICY IF EXISTS "Allow authenticated admins all to settings" ON public.supertour_settings;
DROP POLICY IF EXISTS "Allow public read to settings" ON public.supertour_settings;
DROP POLICY IF EXISTS "Allow public read to public settings" ON public.supertour_settings;
DROP POLICY IF EXISTS "Allow verified admins to manage settings" ON public.supertour_settings;

CREATE POLICY "Allow public read to public settings"
ON public.supertour_settings FOR SELECT
TO anon, authenticated
USING (
    public.is_admin()
    OR key IN ('show_sales_banner', 'visitor_tracking_script', 'anychat_script')
);

CREATE POLICY "Allow verified admins to manage settings"
ON public.supertour_settings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 8. RPC SEGURA Y ATÓMICA DE VOTACIÓN DE ENCUESTAS
-- Elimina la necesidad de conceder UPDATE general sobre surveys a usuarios anónimos.
-- Bloquea la fila con FOR UPDATE para serializar votos concurrentes y prevenir condiciones de carrera (Lost Updates).
-- Preserva TODAS las propiedades existentes de cada objeto JSONB en 'options'.
--
-- NOTA IMPORTANTE SOBRE DEDUPLICACIÓN:
-- Esta función incrementa el voto validando la encuesta y la opción, pero NO implementa
-- deduplicación criptográfica server-side por pasajero. La limitación de voto único
-- reside en el cliente (localStorage). Un usuario que borre su almacenamiento local o
-- consulte la API directamente podrá volver a votar.
CREATE OR REPLACE FUNCTION public.vote_survey_option(
    p_survey_id UUID,
    p_option_text TEXT DEFAULT NULL,
    p_option_index INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_active BOOLEAN;
    v_options JSONB;
    v_new_options JSONB;
    v_found BOOLEAN := false;
    v_elem JSONB;
    v_updated_elem JSONB;
    v_votes INT;
    v_i INT := 0;
BEGIN
    -- Validar parámetros obligatorios
    IF p_survey_id IS NULL THEN
        RAISE EXCEPTION 'El parámetro p_survey_id no puede ser nulo';
    END IF;

    IF (p_option_text IS NULL OR TRIM(p_option_text) = '') AND p_option_index IS NULL THEN
        RAISE EXCEPTION 'Debe especificarse el texto o el índice de la opción a votar';
    END IF;

    -- Bloquear la fila de forma exclusiva durante la transacción para serializar votos concurrentes
    SELECT active, options INTO v_active, v_options
    FROM public.surveys
    WHERE id = p_survey_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Encuesta no encontrada con ID: %', p_survey_id;
    END IF;

    IF NOT v_active THEN
        RAISE EXCEPTION 'La encuesta se encuentra inactiva o finalizada';
    END IF;

    IF jsonb_typeof(v_options) != 'array' THEN
        RAISE EXCEPTION 'Estructura de opciones no válida en encuesta';
    END IF;

    -- Validar límites de índice si fue provisto
    IF p_option_index IS NOT NULL AND (p_option_index < 0 OR p_option_index >= jsonb_array_length(v_options)) THEN
        RAISE EXCEPTION 'El índice de opción % se encuentra fuera de rango (longitud: %)', p_option_index, jsonb_array_length(v_options);
    END IF;

    -- Localizar e incrementar de forma atómica preservando TODAS las propiedades existentes en cada objeto
    v_new_options := '[]'::jsonb;
    FOR v_elem IN SELECT * FROM jsonb_array_elements(v_options)
    LOOP
        -- Coincidencia por índice (prioritaria) o por texto exacto (si no se pasó índice)
        -- Si hay opciones repetidas por texto, 'NOT v_found' asegura incrementar exactamente una
        IF (p_option_index IS NOT NULL AND v_i = p_option_index) 
           OR (p_option_index IS NULL AND (v_elem->>'text') = p_option_text AND NOT v_found) THEN
            
            v_votes := COALESCE((v_elem->>'votes')::INT, 0) + 1;
            
            -- Preservar todas las propiedades preexistentes (id, description, image, etc.) y actualizar solo 'votes'
            v_updated_elem := jsonb_set(v_elem, '{votes}', to_jsonb(v_votes), true);
            
            v_new_options := v_new_options || v_updated_elem;
            v_found := true;
        ELSE
            v_new_options := v_new_options || v_elem;
        END IF;
        v_i := v_i + 1;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'La opción especificada no existe en la encuesta';
    END IF;

    -- Actualizar las opciones en la base de datos de manera atómica
    UPDATE public.surveys
    SET options = v_new_options
    WHERE id = p_survey_id;

    RETURN v_new_options;
END;
$$;

-- Restricción estricta de privilegios de ejecución en RPC
REVOKE ALL ON FUNCTION public.vote_survey_option(UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_survey_option(UUID, TEXT, INT) TO anon, authenticated;
