-- ============================================
-- DIAGNÓSTICO: Usuario existe pero login falla
-- ============================================

-- Verificar información completa del usuario
SELECT 
  '=== INFORMACIÓN DEL USUARIO ===' as info;

SELECT 
  id,
  email,
  encrypted_password IS NOT NULL as tiene_contraseña,
  email_confirmed_at IS NOT NULL as email_confirmado,
  created_at,
  updated_at,
  last_sign_in_at,
  CASE 
    WHEN banned_until IS NOT NULL THEN '❌ Usuario BANNEADO'
    WHEN email_confirmed_at IS NULL THEN '⚠️ Email NO confirmado'
    ELSE '✅ Usuario activo'
  END as estado
FROM auth.users
WHERE email = 'naimpaz274@gmail.com';

-- Verificar perfil
SELECT 
  '=== PERFIL DEL USUARIO ===' as info;

SELECT 
  up.user_id,
  up.role,
  up.barbershop_id,
  b.name as nombre_barberia,
  b.owner_user_id = up.user_id as es_propietario
FROM public.user_profiles up
LEFT JOIN public.barbershops b ON b.id = up.barbershop_id
WHERE up.user_id = (
  SELECT id FROM auth.users WHERE email = 'naimpaz274@gmail.com'
);

-- Verificar si hay problemas de configuración de auth
SELECT 
  '=== CONFIGURACIÓN DE AUTH ===' as info;

-- Verificar si el email está verificado (requisito para login)
SELECT 
  CASE 
    WHEN email_confirmed_at IS NULL THEN 
      '⚠️ PROBLEMA: Email NO confirmado - Esto puede bloquear el login'
    ELSE 
      '✅ Email confirmado'
  END as estado_email
FROM auth.users
WHERE email = 'naimpaz274@gmail.com';

-- Verificar última vez que hizo login
SELECT 
  '=== ÚLTIMO LOGIN ===' as info;

SELECT 
  email,
  last_sign_in_at,
  CASE 
    WHEN last_sign_in_at IS NULL THEN '⚠️ NUNCA ha hecho login'
    WHEN last_sign_in_at < NOW() - INTERVAL '1 day' THEN '⚠️ Último login hace más de 1 día'
    ELSE '✅ Login reciente'
  END as estado_login
FROM auth.users
WHERE email = 'naimpaz274@gmail.com';

