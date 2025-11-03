# 🔧 Solución Completa para Problemas de Login

## 🎯 Problema

Te puedes registrar bien, pero cuando intentas hacer login no funciona.

## 🔍 Diagnóstico Rápido

### Paso 1: Ver qué está pasando

1. **Abre la consola del navegador** (F12 → Console)
2. **Intenta hacer login**
3. **Busca estos mensajes** en la consola:
   - `[signIn] === INICIO LOGIN ===`
   - `[getProfile] === INICIO ===`
   - Si ves `❌ Perfil no encontrado` → El perfil no existe
   - Si ves `❌ Error de permisos RLS` → Las políticas están bloqueando

### Paso 2: Ejecutar SQL de Diagnóstico

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo **`DIAGNOSTICO_LOGIN_MEJORADO.sql`**
3. **Cambia el email** en la línea: `\set email 'TU_EMAIL@ejemplo.com'`
4. **Ejecuta el script**
5. **Revisa los resultados:**
   - Si `NO TIENE PERFIL` → Necesitas crear el perfil
   - Si `NO TIENE BARBERÍA` → Necesitas crear la barbería
   - Si `Política crítica existe` → ✅ La política RLS está bien
   - Si `Función crítica existe` → ✅ La función RPC está bien

## ✅ Solución

### Opción 1: Script Automático (RECOMENDADO)

1. Abre **`ARREGLAR_USUARIOS_EXISTENTES.sql`**
2. **Cambia el email** en la línea: `v_email text := 'TU_EMAIL@ejemplo.com';`
3. Ejecuta el script
4. Deberías ver: `✅ Usuario arreglado`
5. **Intenta hacer login nuevamente**

### Opción 2: SQL Directo

Ejecuta esto en Supabase SQL Editor (cambia el email):

```sql
-- ⚠️ CAMBIA EL EMAIL
DO $$
DECLARE
  v_user_id uuid;
  v_barbershop_id uuid;
  v_email text := 'TU_EMAIL@ejemplo.com';
BEGIN
  -- Obtener user_id
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', v_email;
  END IF;
  
  -- Buscar o crear barbería
  SELECT id INTO v_barbershop_id
  FROM public.barbershops
  WHERE owner_user_id = v_user_id
  LIMIT 1;
  
  IF v_barbershop_id IS NULL THEN
    INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
    VALUES ('Mi Barbería', v_user_id, 1)
    RETURNING id INTO v_barbershop_id;
  END IF;
  
  -- Crear o actualizar perfil
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (v_user_id, 'admin', v_barbershop_id)
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'admin',
        barbershop_id = v_barbershop_id;
  
  RAISE NOTICE '✅ PERFIL ARREGLADO - Puedes hacer login ahora';
END $$;
```

### Opción 3: Usar Función RPC

Si el script anterior no funciona, usa la función RPC:

```sql
-- ⚠️ Obtén tu user_id primero con esto:
SELECT id FROM auth.users WHERE email = 'TU_EMAIL@ejemplo.com';

-- Luego usa ese ID aquí (reemplaza USER_ID_AQUI):
SELECT public.create_barbershop_on_signup(
  'USER_ID_AQUI',  -- ⚠️ Pega tu user_id aquí
  'Mi Barbería',
  1
);
```

## 🚨 Si Nada Funciona

### Verificar Políticas RLS

Ejecuta esto:

```sql
-- Ver todas las políticas de user_profiles
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';

-- Debe mostrar al menos:
-- "Users can view own profile" con cmd = SELECT
```

### Re-ejecutar SQL Completo

Si las políticas no están bien:

1. Ejecuta **`SUPABASE_TODO_EN_UNO.sql`** nuevamente
2. Esto recreará todas las políticas correctamente

## 🧪 Verificar que Funcionó

Ejecuta esto después de arreglar:

```sql
-- Ver tu perfil completo
SELECT 
  u.email,
  up.role,
  b.name as barberia
FROM auth.users u
JOIN public.user_profiles up ON up.user_id = u.id
JOIN public.barbershops b ON b.id = up.barbershop_id
WHERE u.email = 'TU_EMAIL@ejemplo.com';
```

**Debe mostrar:**
- ✅ email: Tu email
- ✅ role: 'admin'
- ✅ barberia: El nombre de tu barbería

Si ves todo esto, **deberías poder hacer login**.

## 📝 Cambios en el Código

El código ahora tiene:

✅ **Logs detallados** en la consola para diagnosticar
✅ **Intentos automáticos** de arreglar el perfil durante login
✅ **Mensajes de error** más claros con soluciones
✅ **Verificación de RLS** para detectar problemas de permisos

**Revisa la consola (F12) cuando hagas login** para ver exactamente qué está pasando.

