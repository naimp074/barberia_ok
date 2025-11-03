-- ============================================
-- SETUP DEFINITIVO Y SIMPLE PARA BARBERÍA
-- Ejecutar TODO este archivo en Supabase SQL Editor
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TODO (OPCIONAL - solo si quieres empezar de cero)
-- ============================================
-- Descomenta esto SOLO si quieres eliminar todo y empezar de cero:
/*
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.barbershops CASCADE;
DROP FUNCTION IF EXISTS public.get_barbers_with_emails(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_barbershop_on_signup(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
*/

-- ============================================
-- PASO 2: CREAR TABLAS
-- ============================================

-- Tabla de barberías
CREATE TABLE IF NOT EXISTS public.barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  num_barbers integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','barber')),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Tabla de servicios
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  price integer NOT NULL CHECK (price > 0),
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PASO 3: AGREGAR COLUMNAS SI NO EXISTEN
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barbershop_id'
  ) THEN
    ALTER TABLE public.services ADD COLUMN barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_user_id'
  ) THEN
    ALTER TABLE public.services ADD COLUMN barber_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- PASO 4: HABILITAR RLS
-- ============================================

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 5: ELIMINAR POLÍTICAS ANTIGUAS
-- ============================================

DO $$ 
BEGIN
  -- Eliminar todas las políticas existentes
  DROP POLICY IF EXISTS "Users can view own barbershop by membership" ON public.barbershops;
  DROP POLICY IF EXISTS "Owner can manage own barbershop" ON public.barbershops;
  DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
  DROP POLICY IF EXISTS "Admins can insert profiles for barbers" ON public.user_profiles;
  DROP POLICY IF EXISTS "Admins can update profiles in own barbershop" ON public.user_profiles;
  DROP POLICY IF EXISTS "Admins can delete profiles in own barbershop" ON public.user_profiles;
  DROP POLICY IF EXISTS "Members can read services" ON public.services;
  DROP POLICY IF EXISTS "Barbers can insert own services" ON public.services;
  DROP POLICY IF EXISTS "Admins can insert services for barbers" ON public.services;
  DROP POLICY IF EXISTS "Barbers can delete own services" ON public.services;
  DROP POLICY IF EXISTS "Admins can delete services in own barbershop" ON public.services;
END $$;

-- ============================================
-- PASO 6: CREAR ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS services_user_id_idx ON public.services(user_id);
CREATE INDEX IF NOT EXISTS services_timestamp_idx ON public.services(timestamp DESC);
CREATE INDEX IF NOT EXISTS services_barbershop_id_idx ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS services_barber_user_id_idx ON public.services(barber_user_id);
CREATE INDEX IF NOT EXISTS user_profiles_barbershop_id_idx ON public.user_profiles(barbershop_id);
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS barbershops_owner_user_id_idx ON public.barbershops(owner_user_id);

-- ============================================
-- PASO 7: POLÍTICAS RLS PARA BARBERSHOPS
-- ============================================

-- Ver barbería si eres miembro
CREATE POLICY "Members can view barbershop"
  ON public.barbershops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.barbershop_id = barbershops.id AND p.user_id = auth.uid()
    )
  );

-- El dueño puede hacer todo con su barbería
CREATE POLICY "Owner can manage barbershop"
  ON public.barbershops FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================
-- PASO 8: POLÍTICAS RLS PARA USER_PROFILES (CRÍTICO PARA LOGIN)
-- ============================================

-- CRÍTICO: Los usuarios DEBEN poder ver su propio perfil para hacer login
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Los usuarios pueden crear su propio perfil (para registro)
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins pueden crear perfiles de barberos en su barbería
CREATE POLICY "Admins can insert barber profiles"
  ON public.user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin
      WHERE admin.user_id = auth.uid()
        AND admin.role = 'admin'
        AND admin.barbershop_id = user_profiles.barbershop_id
    )
  );

-- Admins pueden actualizar perfiles en su barbería
CREATE POLICY "Admins can update profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin
      WHERE admin.user_id = auth.uid()
        AND admin.role = 'admin'
        AND admin.barbershop_id = user_profiles.barbershop_id
    )
  );

-- Admins pueden eliminar perfiles en su barbería
CREATE POLICY "Admins can delete profiles"
  ON public.user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin
      WHERE admin.user_id = auth.uid()
        AND admin.role = 'admin'
        AND admin.barbershop_id = user_profiles.barbershop_id
    )
  );

-- ============================================
-- PASO 9: POLÍTICAS RLS PARA SERVICES
-- ============================================

-- Ver servicios: admin ve todos, barbero solo los suyos
CREATE POLICY "Members can read services"
  ON public.services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.barbershop_id = services.barbershop_id AND p.user_id = auth.uid()
        AND (p.role = 'admin' OR (p.role = 'barber' AND services.barber_user_id = auth.uid()))
    )
  );

-- Barberos pueden insertar sus servicios
CREATE POLICY "Barbers can insert services"
  ON public.services FOR INSERT
  WITH CHECK (
    barber_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = auth.uid()
        AND p.barbershop_id = services.barbershop_id
        AND p.role = 'barber'
    )
  );

-- Admins pueden insertar servicios para cualquier barbero
CREATE POLICY "Admins can insert services"
  ON public.services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin
      WHERE admin.user_id = auth.uid()
        AND admin.role = 'admin'
        AND admin.barbershop_id = services.barbershop_id
    )
  );

-- Barberos pueden eliminar sus servicios
CREATE POLICY "Barbers can delete services"
  ON public.services FOR DELETE
  USING (
    barber_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = auth.uid() AND p.barbershop_id = services.barbershop_id
    )
  );

-- Admins pueden eliminar cualquier servicio de su barbería
CREATE POLICY "Admins can delete services"
  ON public.services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin
      WHERE admin.user_id = auth.uid()
        AND admin.role = 'admin'
        AND admin.barbershop_id = services.barbershop_id
    )
  );

-- ============================================
-- PASO 10: FUNCIÓN CRÍTICA PARA REGISTRO
-- ============================================

CREATE OR REPLACE FUNCTION public.create_barbershop_on_signup(
  p_user_id uuid,
  p_barbershop_name text,
  p_num_barbers integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_barbershop_id uuid;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
  END IF;

  -- Crear barbería
  INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
  VALUES (p_barbershop_name, p_user_id, COALESCE(p_num_barbers, 1))
  RETURNING id INTO v_barbershop_id;

  IF v_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Error: No se pudo crear la barbería';
  END IF;

  -- Crear perfil de admin
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (p_user_id, 'admin', v_barbershop_id);

  RETURN v_barbershop_id;
END;
$$;

-- ============================================
-- PASO 11: OTRAS FUNCIONES
-- ============================================

CREATE OR REPLACE FUNCTION public.get_barbers_with_emails(p_barbershop_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  barbershop_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND barbershop_id = p_barbershop_id
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT 
    up.user_id,
    COALESCE(au.email, '')::text,
    up.role::text,
    up.barbershop_id
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.user_id
  WHERE up.barbershop_id = p_barbershop_id AND up.role = 'barber';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(p_barbershop_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles
  WHERE user_id = auth.uid() AND barbershop_id = p_barbershop_id;
$$;

-- ============================================
-- PASO 12: PERMISOS
-- ============================================

GRANT EXECUTE ON FUNCTION public.create_barbershop_on_signup(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_barbershop_on_signup(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_barbers_with_emails(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- ============================================
-- PASO 13: VERIFICACIÓN
-- ============================================

DO $$
BEGIN
  -- Verificar tablas
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barbershops') THEN
    RAISE EXCEPTION 'ERROR: Tabla barbershops no creada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    RAISE EXCEPTION 'ERROR: Tabla user_profiles no creada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    RAISE EXCEPTION 'ERROR: Tabla services no creada';
  END IF;
  
  -- Verificar función crítica
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_barbershop_on_signup') THEN
    RAISE EXCEPTION 'ERROR: Función create_barbershop_on_signup no creada';
  END IF;
  
  -- Verificar política crítica para login
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    RAISE EXCEPTION 'ERROR: Política "Users can view own profile" no creada';
  END IF;
  
  RAISE NOTICE '✅✅✅ SETUP COMPLETO - Todo está configurado correctamente ✅✅✅';
END $$;

