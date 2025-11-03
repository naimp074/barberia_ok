-- ============================================
-- DIAGNÓSTICO COMPLETO DE LOGIN
-- Ejecuta esto para ver qué está pasando con tu cuenta
-- ============================================

-- ⚠️ CAMBIA ESTE EMAIL POR EL TUYO
\set email 'TU_EMAIL@ejemplo.com'

-- 1. Verificar usuario en auth.users
SELECT 
  '=== USUARIO EN AUTH ===' as seccion,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = :'email';

-- 2. Verificar perfil en user_profiles
SELECT 
  '=== PERFIL DE USUARIO ===' as seccion,
  up.user_id,
  up.role,
  up.barbershop_id,
  up.created_at,
  CASE 
    WHEN up.user_id IS NULL THEN '❌ NO TIENE PERFIL'
    ELSE '✅ TIENE PERFIL'
  END as estado
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
WHERE u.email = :'email';

-- 3. Verificar barbería
SELECT 
  '=== BARBERÍA ===' as seccion,
  b.id,
  b.name,
  b.owner_user_id,
  CASE 
    WHEN b.id IS NULL THEN '❌ NO TIENE BARBERÍA'
    ELSE '✅ TIENE BARBERÍA'
  END as estado
FROM auth.users u
LEFT JOIN public.barbershops b ON b.owner_user_id = u.id
WHERE u.email = :'email';

-- 4. Verificar políticas RLS
SELECT 
  '=== POLÍTICAS RLS ===' as seccion,
  policyname,
  cmd,
  qual,
  CASE 
    WHEN policyname = 'Users can view own profile' THEN '✅ Política crítica existe'
    ELSE '⚠️ Otra política'
  END as importancia
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';

-- 5. Verificar función RPC
SELECT 
  '=== FUNCIÓN RPC ===' as seccion,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name = 'create_barbershop_on_signup' THEN '✅ Función crítica existe'
    ELSE '❌ Función no encontrada'
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'create_barbershop_on_signup';

-- 6. SOLUCIÓN AUTOMÁTICA (ejecutar solo si no tienes perfil)
-- Descomenta y ejecuta esta parte si el perfil es NULL:

/*
DO $$
DECLARE
  v_user_id uuid;
  v_barbershop_id uuid;
  v_email text := 'TU_EMAIL@ejemplo.com'; -- ⚠️ CAMBIA ESTO
BEGIN
  -- Obtener user_id
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', v_email;
  END IF;
  
  -- Buscar barbería existente
  SELECT id INTO v_barbershop_id
  FROM public.barbershops
  WHERE owner_user_id = v_user_id
  LIMIT 1;
  
  -- Si no tiene barbería, crear una
  IF v_barbershop_id IS NULL THEN
    INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
    VALUES ('Mi Barbería', v_user_id, 1)
    RETURNING id INTO v_barbershop_id;
    RAISE NOTICE 'Barbería creada: %', v_barbershop_id;
  END IF;
  
  -- Crear o actualizar perfil
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (v_user_id, 'admin', v_barbershop_id)
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'admin',
        barbershop_id = v_barbershop_id;
  
  RAISE NOTICE '✅✅✅ PERFIL ARREGLADO - Puedes hacer login ahora ✅✅✅';
END $$;
*/

