-- ============================================
-- SCRIPT PARA ARREGLAR USUARIOS EXISTENTES SIN PERFIL
-- ============================================
-- Ejecuta esto DESPUÉS de ejecutar SUPABASE_SETUP_DEFINITIVO.sql
-- Esto creará perfiles para usuarios que ya existen pero no tienen perfil

-- Opción 1: Arreglar UN usuario específico
-- Reemplaza 'TU_EMAIL@ejemplo.com' con el email real
DO $$
DECLARE
  v_user_id uuid;
  v_barbershop_id uuid;
  v_email text := 'TU_EMAIL@ejemplo.com'; -- ⚠️ CAMBIA ESTO
BEGIN
  -- Buscar usuario
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', v_email;
  END IF;
  
  -- Verificar si ya tiene barbería
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
  
  RAISE NOTICE '✅ Usuario arreglado: % puede hacer login ahora', v_email;
END $$;

-- ============================================
-- Opción 2: Arreglar TODOS los usuarios sin perfil
-- ============================================
-- Descomenta esto si quieres arreglar automáticamente todos los usuarios:

/*
DO $$
DECLARE
  v_user RECORD;
  v_barbershop_id uuid;
BEGIN
  FOR v_user IN 
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_profiles up WHERE up.user_id = u.id
    )
  LOOP
    -- Crear barbería
    INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
    VALUES ('Mi Barbería', v_user.id, 1)
    RETURNING id INTO v_barbershop_id;
    
    -- Crear perfil
    INSERT INTO public.user_profiles (user_id, role, barbershop_id)
    VALUES (v_user.id, 'admin', v_barbershop_id);
    
    RAISE NOTICE 'Usuario arreglado: %', v_user.email;
  END LOOP;
  
  RAISE NOTICE '✅ Todos los usuarios fueron arreglados';
END $$;
*/

