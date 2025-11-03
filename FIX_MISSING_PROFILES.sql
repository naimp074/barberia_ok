-- ============================================
-- SCRIPT PARA CORREGIR PERFILES FALTANTES
-- Si tienes usuarios que pueden iniciar sesión pero no tienen perfiles,
-- ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- 1. Ver usuarios sin perfil
-- Esto mostrará todos los usuarios que existen en auth.users pero no tienen perfil
SELECT 
  au.id,
  au.email,
  au.created_at as usuario_creado_en
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC;

-- 2. Verificar políticas RLS en user_profiles
-- Asegúrate de que la política "Users can view own profile" exista
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
  AND policyname = 'Users can view own profile';

-- 3. Si necesitas crear perfiles manualmente para usuarios existentes:
-- NOTA: Solo ejecuta esto si realmente necesitas crear perfiles faltantes
-- Reemplaza los valores entre < > con los datos reales

/*
-- Ejemplo: Crear perfil de admin para un usuario existente
-- Primero necesitas crear una barbería o usar una existente

-- Paso 1: Ver las barberías existentes
SELECT id, name, owner_user_id FROM public.barbershops;

-- Paso 2: Crear perfil para un usuario (reemplaza los UUIDs)
-- Para admin:
INSERT INTO public.user_profiles (user_id, role, barbershop_id)
VALUES (
  '<USER_ID_AQUI>',  -- UUID del usuario de auth.users
  'admin',
  '<BARBERSHOP_ID_AQUI>'  -- UUID de la barbería existente
);

-- Para barbero:
INSERT INTO public.user_profiles (user_id, role, barbershop_id)
VALUES (
  '<USER_ID_AQUI>',
  'barber',
  '<BARBERSHOP_ID_AQUI>'
);
*/

-- 4. Verificar que las políticas permitan la inserción
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
  AND cmd = 'INSERT';

-- ============================================
-- SOLUCIÓN RÁPIDA: Verificar y crear perfiles automáticamente
-- ============================================
-- WARNING: Esto creará perfiles de admin para usuarios sin perfil
-- Solo ejecuta si estás seguro de que quieres hacer esto

/*
-- Opción A: Crear perfiles de admin para usuarios sin perfil
-- (asumiendo que cada usuario es dueño de su propia barbería)
DO $$
DECLARE
  user_record RECORD;
  barbershop_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.user_id
    WHERE up.user_id IS NULL
  LOOP
    -- Buscar si el usuario tiene una barbería
    SELECT * INTO barbershop_record
    FROM public.barbershops
    WHERE owner_user_id = user_record.id
    LIMIT 1;
    
    IF barbershop_record IS NOT NULL THEN
      -- Crear perfil de admin para el dueño de la barbería
      INSERT INTO public.user_profiles (user_id, role, barbershop_id)
      VALUES (user_record.id, 'admin', barbershop_record.id)
      ON CONFLICT (user_id) DO NOTHING;
      
      RAISE NOTICE 'Perfil de admin creado para usuario: % (barbería: %)', user_record.email, barbershop_record.name;
    ELSE
      RAISE NOTICE 'Usuario % no tiene barbería asociada. Necesita crear una barbería primero.', user_record.email;
    END IF;
  END LOOP;
END $$;
*/

-- ============================================
-- SOLUCIÓN RECOMENDADA: Verificar políticas RLS
-- ============================================
-- Si las políticas RLS están bloqueando, ejecuta esto:

-- Verificar todas las políticas de user_profiles
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';

-- Si falta la política "Users can view own profile", créala:
/*
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (user_id = auth.uid());
*/

