-- ============================================
-- MIGRACIÓN COMPLETA PARA BARBERÍA
-- Sistema completo con barberos, analíticas y permisos
-- ============================================

-- 1. CREAR TABLA DE BARBERÍAS
CREATE TABLE IF NOT EXISTS public.barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  num_barbers integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- 2. CREAR TABLA DE PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','barber')),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 3. CREAR TABLA DE SERVICIOS
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  price integer NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 5. CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
CREATE INDEX IF NOT EXISTS services_user_id_idx ON public.services(user_id);
CREATE INDEX IF NOT EXISTS services_timestamp_idx ON public.services(timestamp);
CREATE INDEX IF NOT EXISTS services_barbershop_id_idx ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS services_barber_user_id_idx ON public.services(barber_user_id);
CREATE INDEX IF NOT EXISTS user_profiles_barbershop_id_idx ON public.user_profiles(barbershop_id);

-- ============================================
-- POLÍTICAS RLS PARA BARBERSHOPS
-- ============================================

-- Los usuarios pueden ver su propia barbería si son miembros
DROP POLICY IF EXISTS "Users can view own barbershop by membership" ON public.barbershops;
CREATE POLICY "Users can view own barbershop by membership"
  ON public.barbershops
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.barbershop_id = barbershops.id AND p.user_id = auth.uid()
    )
  );

-- El dueño puede gestionar su barbería
DROP POLICY IF EXISTS "Owner can manage own barbershop" ON public.barbershops;
CREATE POLICY "Owner can manage own barbershop"
  ON public.barbershops
  FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS PARA USER_PROFILES
-- ============================================

-- Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Los usuarios pueden insertar su propio perfil (para registro inicial)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Los admins pueden insertar perfiles para nuevos barberos en su barbería
DROP POLICY IF EXISTS "Admins can insert profiles for barbers" ON public.user_profiles;
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
DROP POLICY IF EXISTS "Admins can update profiles in own barbershop" ON public.user_profiles;
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
  );

-- ============================================
-- POLÍTICAS RLS PARA SERVICES
-- ============================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert own services" ON public.services;
DROP POLICY IF EXISTS "Users can update own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete own services" ON public.services;
DROP POLICY IF EXISTS "Members can read services" ON public.services;
DROP POLICY IF EXISTS "Barbers insert own services" ON public.services;

-- Los miembros de la barbería pueden ver servicios de su barbería
-- Los barberos solo ven sus propios servicios, los admins ven todos
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
-- FUNCIONES AUXILIARES (OPCIONAL)
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

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE public.barbershops IS 'Almacena información de las barberías';
COMMENT ON TABLE public.user_profiles IS 'Perfiles de usuario con rol y barbería asociada';
COMMENT ON TABLE public.services IS 'Registros de servicios/cortes realizados';

COMMENT ON COLUMN public.services.barber_user_id IS 'ID del barbero que realizó el servicio';
COMMENT ON COLUMN public.services.barbershop_id IS 'ID de la barbería donde se realizó el servicio';
COMMENT ON COLUMN public.services.user_id IS 'ID del usuario que creó el registro (compatibilidad)';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

