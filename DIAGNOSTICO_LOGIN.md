# 🔍 Diagnóstico de Problemas de Login

Si no puedes iniciar sesión, sigue estos pasos para identificar el problema:

## 📋 Paso 1: Verificar la Consola del Navegador

1. Abre la aplicación
2. Presiona **F12** para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**
4. Intenta hacer login
5. Copia **todos los mensajes** que aparezcan (especialmente los que dicen `[signInWithPassword]`)

## 🔍 Problemas Comunes y Soluciones

### ❌ Error: "Email o contraseña incorrectos"

**Causa:** Las credenciales no son correctas.

**Solución:**
1. Verifica que estés usando el email correcto (respeta mayúsculas/minúsculas)
2. Verifica que la contraseña sea correcta
3. Intenta escribir la contraseña en un editor de texto para ver si hay espacios adicionales
4. Si olvidaste la contraseña, puedes restablecerla desde Supabase Dashboard

**Verificar en Supabase:**
```sql
-- En Supabase SQL Editor, ver usuarios
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'tu-email@ejemplo.com';
```

---

### ❌ Error: "Tu cuenta necesita ser verificada"

**Causa:** Tienes la verificación de email activada y no has verificado tu cuenta.

**Solución:**
1. Revisa tu bandeja de entrada (y spam)
2. Busca un email de Supabase con el asunto "Confirm your signup"
3. Haz clic en el enlace de verificación
4. Después de verificar, intenta iniciar sesión nuevamente

**O desactivar temporalmente la verificación:**
1. Ve a Supabase Dashboard → Authentication → Settings
2. Desactiva "Confirm email"
3. Guarda los cambios

---

### ❌ Error: "Tu cuenta no tiene un perfil configurado"

**Causa:** El usuario existe en `auth.users` pero no tiene perfil en `user_profiles`.

**Solución 1: Crear perfil manualmente**
```sql
-- En Supabase SQL Editor
-- Primero, encuentra el ID del usuario
SELECT id, email FROM auth.users WHERE email = 'tu-email@ejemplo.com';

-- Luego, crea un perfil (reemplaza USER_ID y BARBERSHOP_ID)
INSERT INTO public.user_profiles (user_id, role, barbershop_id)
VALUES (
  'USER_ID_AQUI', 
  'admin', 
  'BARBERSHOP_ID_AQUI'
);
```

**Solución 2: Verificar que existe la barbería**
```sql
-- Ver todas las barberías
SELECT * FROM public.barbershops;

-- Si no hay barberías, crea una:
INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
VALUES ('Mi Barbería', 'USER_ID_AQUI', 1)
RETURNING id;
```

---

### ❌ La aplicación se queda en "Cargando..."

**Causa:** Hay un error silencioso o timeout.

**Solución:**
1. Abre la consola (F12)
2. Busca errores en rojo
3. Revisa la pestaña **Network** para ver si hay requests fallidos
4. Verifica que Supabase esté configurado correctamente

**Verificar configuración:**
- Abre `.env.local` en la raíz del proyecto
- Verifica que tenga:
  ```
  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
  VITE_SUPABASE_ANON_KEY=tu-clave-anon
  ```
- Reinicia el servidor después de modificar `.env.local`

---

### ❌ Error: "Error de permisos RLS" o "row-level security policy"

**Causa:** Las políticas RLS están bloqueando el acceso.

**Solución:**
1. Verifica que ejecutaste el SQL completo (`SUPABASE_COMPLETE_SETUP_FIXED.sql`)
2. Verifica que las políticas existen:

```sql
-- Ver todas las políticas
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

3. Deberías ver estas políticas para `user_profiles`:
   - "Users can view own profile"
   - "Users can insert own profile"

---

### ❌ Error de conexión o timeout

**Causa:** Problemas de red o Supabase no está disponible.

**Solución:**
1. Verifica tu conexión a internet
2. Verifica que Supabase esté funcionando: https://status.supabase.com
3. Verifica que las credenciales en `.env.local` sean correctas
4. Intenta desde otro navegador o en modo incógnito

---

## 🧪 Pruebas para Diagnosticar

### Prueba 1: Verificar que el usuario existe

```sql
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at,
  user_metadata
FROM auth.users 
WHERE email = 'tu-email@ejemplo.com';
```

**Resultado esperado:** Deberías ver una fila con tu usuario.

---

### Prueba 2: Verificar que existe el perfil

```sql
SELECT 
  up.user_id,
  up.role,
  up.barbershop_id,
  b.name as barbershop_name
FROM public.user_profiles up
LEFT JOIN public.barbershops b ON b.id = up.barbershop_id
WHERE up.user_id = (
  SELECT id FROM auth.users WHERE email = 'tu-email@ejemplo.com'
);
```

**Resultado esperado:** Deberías ver una fila con tu perfil y barbería.

---

### Prueba 3: Verificar políticas RLS

```sql
-- Ver políticas activas para user_profiles
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';
```

**Resultado esperado:** Deberías ver al menos:
- "Users can view own profile" con `cmd = SELECT`

---

## 🔧 Script SQL para Corregir Usuario Roto

Si tu usuario existe pero no tiene perfil, ejecuta esto (reemplaza los valores):

```sql
-- 1. Obtener el ID del usuario
DO $$
DECLARE
  v_user_id uuid;
  v_barbershop_id uuid;
BEGIN
  -- Obtener ID del usuario
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'tu-email@ejemplo.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  -- Crear barbería si no existe
  SELECT id INTO v_barbershop_id
  FROM public.barbershops
  WHERE owner_user_id = v_user_id;
  
  IF v_barbershop_id IS NULL THEN
    INSERT INTO public.barbershops (name, owner_user_id, num_barbers)
    VALUES ('Mi Barbería', v_user_id, 1)
    RETURNING id INTO v_barbershop_id;
  END IF;
  
  -- Crear perfil si no existe
  INSERT INTO public.user_profiles (user_id, role, barbershop_id)
  VALUES (v_user_id, 'admin', v_barbershop_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Usuario corregido exitosamente. User ID: %, Barbershop ID: %', v_user_id, v_barbershop_id;
END $$;
```

---

## 📞 Información para Reportar el Error

Si nada funciona, copia esta información:

1. **Mensaje de error exacto** que ves en la pantalla
2. **Logs de la consola** (F12 → Console)
3. **Resultado de las pruebas SQL** anteriores
4. **Si puedes registrar un nuevo usuario** o no

Con esta información puedo ayudarte mejor.

