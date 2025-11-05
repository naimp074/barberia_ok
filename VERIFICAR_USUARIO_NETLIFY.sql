-- ============================================
-- VERIFICAR USUARIO EN PRODUCCIÓN
-- Ejecuta este script en Supabase SQL Editor
-- para verificar si tu usuario existe
-- ============================================

-- ⚠️ CAMBIA ESTE EMAIL POR EL TUYO
DO $$
DECLARE
  v_email text := 'naimpaz274@gmail.com'; -- ⚠️ CAMBIA ESTO
  v_user_id uuid;
  v_profile_exists boolean;
  v_barbershop_id uuid;
BEGIN
  RAISE NOTICE '=== VERIFICACIÓN DE USUARIO ===';
  RAISE NOTICE 'Email buscado: %', v_email;
  
  -- 1. Verificar si el usuario existe en auth.users
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌❌❌ USUARIO NO ENCONTRADO ❌❌❌';
    RAISE NOTICE 'El email % no existe en este proyecto de Supabase', v_email;
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUCIÓN:';
    RAISE NOTICE '1. Ve a tu sitio en Netlify';
    RAISE NOTICE '2. Haz clic en "Registrarse"';
    RAISE NOTICE '3. Usa el email: %', v_email;
    RAISE NOTICE '4. Crea una contraseña';
    RAISE NOTICE '5. Intenta login nuevamente';
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado en auth.users';
  RAISE NOTICE '   ID: %', v_user_id;
  
  -- 2. Verificar si tiene email confirmado
  SELECT email_confirmed_at IS NOT NULL INTO v_profile_exists
  FROM auth.users
  WHERE id = v_user_id;
  
  IF v_profile_exists THEN
    RAISE NOTICE '✅ Email confirmado';
  ELSE
    RAISE NOTICE '⚠️ Email NO confirmado (puede causar problemas de login)';
    RAISE NOTICE '   SOLUCIÓN: Desactiva "Confirm email" en Authentication → Settings';
  END IF;
  
  -- 3. Verificar si tiene perfil
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE user_id = v_user_id
  ) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️⚠️⚠️ PERFIL NO ENCONTRADO ⚠️⚠️⚠️';
    RAISE NOTICE 'El usuario existe pero no tiene perfil en user_profiles';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUCIÓN: Ejecuta ARREGLAR_PERFIL_RAPIDO.sql';
    RAISE NOTICE 'Cambia el email en ese script y ejecútalo';
  ELSE
    RAISE NOTICE '✅ Perfil encontrado en user_profiles';
    
    -- Verificar barbería
    SELECT barbershop_id INTO v_barbershop_id
    FROM public.user_profiles
    WHERE user_id = v_user_id;
    
    IF v_barbershop_id IS NULL THEN
      RAISE NOTICE '⚠️ Perfil sin barbershop_id';
    ELSE
      RAISE NOTICE '✅ Asociado a barbería: %', v_barbershop_id;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RESUMEN ===';
  RAISE NOTICE 'Usuario: % ✅', v_email;
  RAISE NOTICE 'ID: %', v_user_id;
  RAISE NOTICE 'Email confirmado: %', CASE WHEN v_profile_exists THEN 'Sí' ELSE 'No' END;
  RAISE NOTICE 'Perfil existe: %', CASE WHEN v_profile_exists THEN 'Sí' ELSE 'No' END;
  
  IF v_profile_exists AND v_barbershop_id IS NOT NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅✅✅ TODO ESTÁ CORRECTO ✅✅✅';
    RAISE NOTICE 'Si el login no funciona, puede ser:';
    RAISE NOTICE '1. Contraseña incorrecta';
    RAISE NOTICE '2. Proyecto de Supabase diferente en Netlify';
    RAISE NOTICE '3. Variables de entorno incorrectas en Netlify';
  END IF;
END $$;

-- Ver todos los usuarios para referencia
SELECT 
  '=== TODOS LOS USUARIOS ===' as info;

SELECT 
  email,
  email_confirmed_at IS NOT NULL as email_confirmado,
  created_at,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.users.id) 
    THEN '✅ Tiene perfil'
    ELSE '❌ Sin perfil'
  END as perfil
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

