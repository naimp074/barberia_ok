-- ============================================
-- SETUP COMPLETO Y DEFINITIVO DE BASE DE DATOS
-- PARA SISTEMA DE BARBERÍA
-- ============================================
-- Ejecutar TODO este archivo en Supabase SQL Editor
-- Versión: Final - Listo para producción
-- ============================================

-- ============================================
-- 1. ELIMINAR OBJETOS EXISTENTES (OPCIONAL)
-- Descomentar SOLO si necesitas empezar desde cero
-- ============================================
/*
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.barbershops CASCADE;
DROP FUNCTION IF EXISTS public.get_barbers_with_emails(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_barbershop_on_signup(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
*/

-- ============================================
-- 2. CREAR TABLAS
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

-- Tabla de servicios (cortes registrados)
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
-- 3. AGREGAR COLUMNAS SI NO EXISTEN
-- ============================================

DO $$ 
BEGIN
  -- Agregar barbershop_id a services si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barbershop_id'
  ) THEN
    ALTER TABLE public.services
      ADD COLUMN barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE;
  END IF;

  -- Agregar barber_user_id a services si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'services' 
    AND column_name = 'barber_user_id'
  ) THEN
    ALTER TABLE public.services
      ADD COLUMN barber_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS services_user_id_idx ON public.services(user_id);
CREATE INDEX IF NOT EXISTS services_timestamp_idx ON public.services(timestamp DESC);
CREATE INDEX IF NOT EXISTS services_barbershop_id_idx ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS services_barber_user_id_idx ON public.services(barber_user_id);
CREATE INDEX IF NOT EXISTS user_profiles_barbershop_id_idx ON public.user_profiles(barbershop_id);
CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS barbershops_owner_user_id_idx ON public.barbershops(owner_user_id);

-- ============================================
-- 6. ELIMINAR POLÍTICAS ANTIGUAS (SI EXISTEN)
-- ============================================

-- Políticas de barbershops
DROP POLICY IF EXISTS "Users can view own barbershop by membership" ON public.barbershops;
DROP POLICY IF EXISTS "Owner can manage own barbershop" ON public.barbershops;

-- Políticas de user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles for barbers" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles in own barbershop" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles in own barbershop" ON public.user_profiles;

-- Políticas de services
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert own services" ON public.services;
DROP POLICY IF EXISTS "Users can update own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete own services" ON public.services;
DROP POLICY IF EXISTS "Members can read services" ON public.services;
DROP POLICY IF EXISTS "Barbers insert own services" ON public.services;
DROP POLICY IF EXISTS "Barbers can insert own services" ON public.services;
DROP POLICY IF EXISTS "Admins can insert services for barbers" ON public.services;
DROP POLICY IF EXISTS "Barbers can delete own services" ON public.services;
DROP POLICY IF EXISTS "Admins can delete services in own barbershop" ON public.services;

-- ============================================
-- 7. POLÍTICAS RLS PARA BARBERSHOPS
-- ============================================

-- Los usuarios pueden ver su propia barbería si son miembros
CREATE POLICY "Users can view own barbershop by membership"
  ON public.barbershops
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.barbershop_id = barbershops.id 
      AND p.user_id = auth.uid()
    )
  );

-- El dueño puede gestionar su barbería (INSERT, UPDATE, DELETE)
CREATE POLICY "Owner can manage own barbershop"
  ON public.barbershops
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================
-- 8. POLÍTICAS RLS PARA USER_PROFILES
-- ============================================

-- Los usuarios pueden ver su propio perfil (CRÍTICO PARA LOGIN)
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Los usuarios pueden insertar su propio perfil (para registro inicial)
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Los admins pueden insertar perfiles para nuevos barberos en su barbería
CREATE POLICY "Admins can insert profiles for barbers"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin_profile
      WHERE admin_profile.user_id = auth.uid()
        AND admin_profile.role = 'admin'
        AND admin_profile.barbershop_id = user_profiles.barbershop_id
    )
  );

-- Los admins pueden actualizar perfiles de su barbería
CREATE POLICY "Admins can update profiles in own barbershop"
  ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin_profile
      WHERE admin_profile.user_id = auth.uid()
        AND admin_profile.role = 'admin'
        AND admin_profile.barbershop_id = user_profiles.barbershop_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin_profile
      WHERE admin_profile.user_id = auth.uid()
        AND admin_profile.role = 'admin'
        AND admin_profile.barbershop_id = user_profiles.barbershop_id
    )
  );

-- Los admins pueden eliminar perfiles de barberos en su barbería
CREATE POLICY "Admins can delete profiles in own barbershop"
  ON public.user_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin_profile
      WHERE admin_profile.user_id = auth.uid()
        AND admin_profile.role = 'admin'
        AND admin_profile.barbershop_id = user_profiles.barbershop_id
    )
  );

-- ============================================
-- 9. POLÍTICAS RLS PARA SERVICES
-- ============================================

-- Los miembros de la barbería pueden ver servicios
-- Admin ve todos los servicios de la barbería
-- Barbero solo ve sus propios servicios
CREATE POLICY "Members can read services"
  ON public.services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.barbershop_id = services.barbershop_id 
        AND p.user_id = auth.uid()
        AND (
          -- Admin ve todos los servicios de la barbería
          p.role = 'admin'
          OR
          -- Barbero solo ve sus propios servicios
          (p.role = 'barber' AND services.barber_user_id = auth.uid())
        )
    )
  );

-- Los barberos pueden insertar sus propios servicios en su barbería
CREATE POLICY "Barbers can insert own services"
  ON public.services
  FOR INSERT
  WITH CHECK (
    barber_user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.user_profiles p 
      WHERE p.user_id = auth.uid() 
        AND p.barbershop_id = services.barbershop_id
        AND p.role = 'barber'
    )
  );

-- Los admins pueden insertar servicios asignados a cualquier barbero de su barbería
CREATE POLICY "Admins can insert services for barbers"
  ON public.services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin_profile
      WHERE admin_profile.user_id = auth.uid()
        AND admin_profile.role = 'admin'
        AND admin_profile.barbershop_id = services.barbershop_id
        AND EXISTS (
          SELECT 1 FROM public.user_profiles barber_profile
          WHERE barber_profile.user_id = services.barber_user_id
            AND barber_profile.barbershop_id = services.barbershop_id
        )
    )
  );

-- Los barberos pueden eliminar sus propios servicios
CREATE POLICY "Barbers can delete own services"
  ON public.services
  FOR DELETE
  USING (
    barber_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id = auth.uid()
        AND p.barbershop_id = services.barbershop_id
    )
  );

-- Los admins pueden eliminar cualquier servicio de su barbería
CREATE POLICY "Admins can delete services in own barbershop"
  ON public.services
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles admin_profile
      WHERE admin_profile.user_id = auth.uid()
        AND admin_profile.role = 'admin'
        AND admin_profile.barbershop_id = services.barbershop_id
    )
  );

-- ============================================
-- 10. FUNCIONES SQL
-- ============================================

-- Función para obtener el rol del usuario actual en una barbería
CREATE OR REPLACE FUNCTION public.get_user_role(p_barbershop_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.user_profiles
  WHERE user_id = auth.uid() AND barbershop_id = p_barbershop_id;
$$;

-- Función para obtener barberos con emails de forma segura
-- Permite que los admins vean los emails de los barberos de su barbería
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
  -- Verificar que el usuario es miembro de la barbería
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND barbershop_id = p_barbershop_id
  ) THEN
    RAISE EXCEPTION 'No autorizado: No eres miembro de esta barbería';
  END IF;

  RETURN QUERY
  SELECT 
    up.user_id,
    COALESCE(au.email, '')::text as email,
    up.role::text,
    up.barbershop_id
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.user_id
  WHERE up.barbershop_id = p_barbershop_id
    AND up.role = 'barber';
END;
$$;

-- Función CRÍTICA: Crear barbería y perfil durante el registro
-- Esto evita problemas con RLS cuando el usuario acaba de registrarse
CREATE OR REPLACE FUNCTION public.create_barbershop_on_signup(
  p_user_id uuid,
  p_barbershop_name text,
  p_num_barbers integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barbershop_id uuid;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Crear barbería
  INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
  VALUES (p_barbershop_name, p_user_id, p_num_barbers)
  RETURNING id INTO v_barbershop_id;

  IF v_barbershop_id IS NULL THEN
    RAISE EXCEPTION 'Error creando barbería';
  END IF;

  -- Crear perfil de admin
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (p_user_id, 'admin', v_barbershop_id);

  RETURN v_barbershop_id;
END;
$$;

-- ============================================
-- 11. PERMISOS
-- ============================================

-- Permitir ejecutar funciones a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_barbers_with_emails(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_barbershop_on_signup(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- También permitir a service_role (para triggers de auth)
GRANT EXECUTE ON FUNCTION public.create_barbershop_on_signup(uuid, text, integer) TO service_role;

-- ============================================
-- 12. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE public.barbershops IS 'Almacena información de las barberías';
COMMENT ON TABLE public.user_profiles IS 'Perfiles de usuario con rol y barbería asociada - CRÍTICO para login';
COMMENT ON TABLE public.services IS 'Registros de servicios/cortes realizados';

COMMENT ON COLUMN public.services.barber_user_id IS 'ID del barbero que realizó el servicio';
COMMENT ON COLUMN public.services.barbershop_id IS 'ID de la barbería donde se realizó el servicio';
COMMENT ON COLUMN public.services.user_id IS 'ID del usuario que creó el registro (compatibilidad)';

COMMENT ON FUNCTION public.get_barbers_with_emails(uuid) IS 'Obtiene lista de barberos con sus emails. Solo accesible por miembros de la barbería.';
COMMENT ON FUNCTION public.create_barbershop_on_signup(uuid, text, integer) IS 'Crea una barbería y perfil de admin para un usuario recién registrado - FUNCIÓN CRÍTICA';
COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Obtiene el rol del usuario actual en una barbería específica';

-- ============================================
-- 13. VERIFICACIONES FINALES
-- ============================================

-- Verificar que las tablas se crearon
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barbershops') THEN
    RAISE EXCEPTION 'Error: La tabla barbershops no se creó';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    RAISE EXCEPTION 'Error: La tabla user_profiles no se creó';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    RAISE EXCEPTION 'Error: La tabla services no se creó';
  END IF;
  
  RAISE NOTICE '✅ Todas las tablas se crearon correctamente';
END $$;

-- Verificar que las funciones se crearon
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'create_barbershop_on_signup') THEN
    RAISE EXCEPTION 'Error: La función create_barbershop_on_signup no se creó';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_barbers_with_emails') THEN
    RAISE EXCEPTION 'Error: La función get_barbers_with_emails no se creó';
  END IF;
  
  RAISE NOTICE '✅ Todas las funciones se crearon correctamente';
END $$;

-- Verificar que las políticas existen
DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
    AND policyname = 'Users can view own profile';
  
  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'Error: La política "Users can view own profile" no existe';
  END IF;
  
  RAISE NOTICE '✅ Políticas RLS verificadas correctamente';
END $$;

-- ============================================
-- 14. RESUMEN FINAL
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SETUP COMPLETO EXITOSO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tablas creadas:';
  RAISE NOTICE '  - barbershops';
  RAISE NOTICE '  - user_profiles';
  RAISE NOTICE '  - services';
  RAISE NOTICE '';
  RAISE NOTICE 'Funciones creadas:';
  RAISE NOTICE '  - create_barbershop_on_signup';
  RAISE NOTICE '  - get_barbers_with_emails';
  RAISE NOTICE '  - get_user_role';
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas RLS configuradas correctamente';
  RAISE NOTICE '';
  RAISE NOTICE 'La base de datos está lista para usar!';
  RAISE NOTICE '';
END $$;

-- ============================================
-- FIN DEL SETUP
-- ============================================

-- Para verificar manualmente después:
-- 
-- Ver todas las tablas:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
--
-- Ver todas las funciones:
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';
--
-- Ver todas las políticas:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

