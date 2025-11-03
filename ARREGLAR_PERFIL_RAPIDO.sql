-- ============================================
-- ARREGLAR PERFIL RÁPIDO
-- Usa este script si getProfile está tardando demasiado
-- ============================================

-- ⚠️ CAMBIA ESTE EMAIL POR EL TUYO
DO $$
DECLARE
  v_user_id uuid;
  v_barbershop_id uuid;
  v_email text := 'naimpaz274@gmail.com'; -- ⚠️ CAMBIA ESTO
BEGIN
  RAISE NOTICE 'Buscando usuario: %', v_email;
  
  -- Obtener user_id
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Usuario no encontrado: %', v_email;
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado: %', v_user_id;
  
  -- Verificar si ya tiene perfil
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = v_user_id) THEN
    RAISE NOTICE '⚠️ El usuario ya tiene un perfil';
    
    -- Verificar si el perfil tiene barbershop_id
    SELECT barbershop_id INTO v_barbershop_id
    FROM public.user_profiles
    WHERE user_id = v_user_id;
    
    IF v_barbershop_id IS NULL THEN
      RAISE EXCEPTION '❌ El perfil existe pero no tiene barbershop_id';
    END IF;
    
    RAISE NOTICE '✅ El perfil está completo';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Creando perfil para el usuario...';
  
  -- Buscar barbería existente
  SELECT id INTO v_barbershop_id
  FROM public.barbershops
  WHERE owner_user_id = v_user_id
  LIMIT 1;
  
  -- Si no tiene barbería, crear una
  IF v_barbershop_id IS NULL THEN
    RAISE NOTICE 'No tiene barbería, creando una nueva...';
    INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
    VALUES ('Mi Barbería', v_user_id, 1)
    RETURNING id INTO v_barbershop_id;
    RAISE NOTICE '✅ Barbería creada: %', v_barbershop_id;
  ELSE
    RAISE NOTICE '✅ Barbería existente encontrada: %', v_barbershop_id;
  END IF;
  
  -- Crear perfil
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (v_user_id, 'admin', v_barbershop_id);
  
  RAISE NOTICE '✅✅✅ PERFIL CREADO EXITOSAMENTE ✅✅✅';
  RAISE NOTICE 'Ahora puedes hacer login sin problemas';
END $$;

-- Verificar que se creó correctamente
SELECT 
  '=== VERIFICACIÓN ===' as info,
  u.email,
  up.role,
  b.name as barberia,
  CASE 
    WHEN up.user_id IS NOT NULL THEN '✅ PERFIL OK'
    ELSE '❌ PERFIL FALTANTE'
  END as estado
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.barbershops b ON b.id = up.barbershop_id
WHERE u.email = 'naimpaz274@gmail.com'; -- ⚠️ CAMBIA ESTO TAMBIÉN

