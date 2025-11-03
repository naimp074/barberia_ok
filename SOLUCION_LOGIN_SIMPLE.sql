-- ============================================
-- SOLUCIÓN RÁPIDA PARA LOGIN ROTO
-- ============================================
-- Ejecuta este script SI el login no funciona
-- Reemplaza 'TU_EMAIL@ejemplo.com' con tu email real

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'TU_EMAIL@ejemplo.com'; -- ⚠️ CAMBIA ESTO
  v_barbershop_id uuid;
  v_existing_barbershop uuid;
BEGIN
  -- 1. Buscar usuario por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ Usuario no encontrado con email: %', v_email;
  END IF;
  
  RAISE NOTICE '✅ Usuario encontrado: % (ID: %)', v_email, v_user_id;
  
  -- 2. Verificar si ya tiene barbería
  SELECT id INTO v_existing_barbershop
  FROM public.barbershops
  WHERE owner_user_id = v_user_id
  LIMIT 1;
  
  IF v_existing_barbershop IS NOT NULL THEN
    v_barbershop_id := v_existing_barbershop;
    RAISE NOTICE '✅ Barbería existente encontrada: %', v_barbershop_id;
  ELSE
    -- Crear nueva barbería
    INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
    VALUES (
      COALESCE((SELECT raw_user_meta_data->>'barbershop_name' FROM auth.users WHERE id = v_user_id), 'Mi Barbería'),
      v_user_id,
      1
    )
    RETURNING id INTO v_barbershop_id;
    RAISE NOTICE '✅ Nueva barbería creada: %', v_barbershop_id;
  END IF;
  
  -- 3. Crear o actualizar perfil
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (v_user_id, 'admin', v_barbershop_id)
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'admin',
        barbershop_id = v_barbershop_id;
  
  RAISE NOTICE '✅ Perfil creado/actualizado para usuario: %', v_email;
  RAISE NOTICE '✅ RESULTADO FINAL: Usuario % puede hacer login ahora', v_email;
  
END $$;

-- ============================================
-- VERIFICACIÓN POST-FIX
-- ============================================
-- Ejecuta esto después para verificar que todo esté bien:

SELECT 
  u.email,
  u.email_confirmed_at IS NOT NULL as email_verificado,
  up.role,
  b.name as barberia,
  CASE 
    WHEN up.user_id IS NULL THEN '❌ NO TIENE PERFIL'
    WHEN up.barbershop_id IS NULL THEN '❌ NO TIENE BARBERÍA'
    ELSE '✅ TODO CORRECTO'
  END as estado
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.barbershops b ON b.id = up.barbershop_id
WHERE u.email = 'TU_EMAIL@ejemplo.com'; -- ⚠️ CAMBIA ESTO

