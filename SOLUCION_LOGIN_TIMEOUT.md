# 🔧 Solución para Timeout en Login

## 🔍 Problema Identificado

Según los logs de la consola, el problema es que:
1. `getProfile` está tardando demasiado o no devuelve resultados
2. Hay múltiples intentos de buscar perfiles con diferentes IDs de usuario
3. El timeout se dispara antes de que termine la operación

## ✅ Cambios Aplicados

### 1. **Simplificado `getProfile`**
- Eliminado el timeout complejo con Promise.race
- Dejado que Supabase maneje su propio timeout interno
- Esto reduce la complejidad y puede evitar problemas de race conditions

### 2. **Aumentado Timeout en Login**
- Timeout del formulario aumentado de 15 a 30 segundos
- Timeout para obtener perfil aumentado a 10 segundos
- Esto da más tiempo para conexiones lentas

### 3. **Mejorado Manejo de Perfiles Faltantes**
- Si no encuentra el perfil, intenta completar el registro automáticamente
- Muestra mensajes más claros sobre qué hacer

## 🔍 Próximos Pasos para Diagnosticar

### Verificar que el Usuario Tiene Perfil

Ejecuta esto en Supabase SQL Editor (reemplaza el email):

```sql
-- Verificar usuario y perfil
SELECT 
  u.id as user_id,
  u.email,
  u.email_confirmed_at,
  up.role,
  up.barbershop_id,
  b.name as barbershop_name
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.barbershops b ON b.id = up.barbershop_id
WHERE u.email = 'naimpaz274@gmail.com';
```

**Resultado esperado:**
- Deberías ver una fila con tu usuario
- `role` no debe ser NULL
- `barbershop_id` no debe ser NULL
- `barbershop_name` debe tener un nombre

### Si No Tiene Perfil, Crearlo

```sql
-- Reemplaza estos valores:
-- USER_ID: el ID del usuario de la consulta anterior
-- BARBERSHOP_ID: el ID de la barbería (si existe) o NULL para crear una nueva

DO $$
DECLARE
  v_user_id uuid := 'USER_ID_AQUI';
  v_barbershop_id uuid;
  v_barbershop_name text := 'Mi Barbería';
BEGIN
  -- Verificar si ya tiene barbería
  SELECT id INTO v_barbershop_id
  FROM public.barbershops
  WHERE owner_user_id = v_user_id;
  
  -- Si no tiene barbería, crear una
  IF v_barbershop_id IS NULL THEN
    INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
    VALUES (v_barbershop_name, v_user_id, 1)
    RETURNING id INTO v_barbershop_id;
  END IF;
  
  -- Crear perfil si no existe
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (v_user_id, 'admin', v_barbershop_id)
  ON CONFLICT (user_id) DO UPDATE
    SET barbershop_id = v_barbershop_id;
  
  RAISE NOTICE 'Usuario corregido. User: %, Barbershop: %', v_user_id, v_barbershop_id;
END $$;
```

### Verificar Políticas RLS

```sql
-- Ver políticas para user_profiles
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';
```

Debe existir al menos:
- `"Users can view own profile"` con `cmd = SELECT`

## 🧪 Probar el Login Ahora

1. **Recarga la página** (Ctrl+F5 o Cmd+Shift+R)
2. **Intenta hacer login** nuevamente
3. **Abre la consola** (F12) y observa los mensajes
4. **Si sigue fallando:**
   - Copia todos los mensajes de la consola
   - Ejecuta las consultas SQL anteriores
   - Comparte los resultados

## 💡 Posibles Causas Restantes

1. **Conexión lenta a Supabase**
   - Prueba desde otra red
   - Verifica que Supabase esté funcionando: https://status.supabase.com

2. **Problemas de RLS**
   - Las políticas pueden estar bloqueando
   - Verifica que las políticas estén correctamente configuradas

3. **Usuario sin perfil**
   - El usuario existe pero no tiene perfil
   - Usa el script SQL de arriba para crear el perfil

4. **Base de datos lenta**
   - Puede haber muchas consultas corriendo
   - Espera unos minutos y vuelve a intentar

