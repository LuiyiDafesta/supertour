-- ====================================================================
-- SUPERTOURCHANNEL — CREACIÓN Y HABILITACIÓN DE ADMINISTRADOR PAX
-- Fecha: 2026-10-21 09:00:00
-- Email: pax@travelrockchannel.com.ar
-- Contraseña asignada: Tra20Vel26@
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Asegurar tabla public.admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_users TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated users to check own admin status" ON public.admin_users;
CREATE POLICY "Allow authenticated users to check own admin status"
ON public.admin_users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 2. Crear o actualizar usuario pax@travelrockchannel.com.ar en auth.users
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'pax@travelrockchannel.com.ar';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'pax@travelrockchannel.com.ar',
      crypt('Tra20Vel26@', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Admin","last_name":"Pax"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id::text, 'pax@travelrockchannel.com.ar')::jsonb,
      'email',
      'pax@travelrockchannel.com.ar',
      NOW(),
      NOW(),
      NOW()
    );
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Tra20Vel26@', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- 3. Habilitar a ambos administradores en public.admin_users
  INSERT INTO public.admin_users (id, email)
  SELECT id, email FROM auth.users 
  WHERE email IN ('pax@travelrockchannel.com.ar', 'lsnetinformatica2024@gmail.com')
  ON CONFLICT (id) DO NOTHING;
END $$;
