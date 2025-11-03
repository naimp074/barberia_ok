# 🚀 Instrucciones de Setup Definitivo

## 📋 Pasos Obligatorios

### 1. Ejecutar SQL en Supabase

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo **`SUPABASE_SETUP_DEFINITIVO.sql`**
3. Copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **RUN** (o presiona `Ctrl+Enter`)
6. Deberías ver: `✅✅✅ SETUP COMPLETO - Todo está configurado correctamente ✅✅✅`

### 2. Arreglar Usuarios Existentes (Si los hay)

Si ya tienes usuarios registrados pero no pueden hacer login:

1. Abre **`ARREGLAR_USUARIOS_EXISTENTES.sql`**
2. Reemplaza `'TU_EMAIL@ejemplo.com'` con tu email real
3. Ejecuta el script
4. Deberías ver: `✅ Usuario arreglado: [email] puede hacer login ahora`

### 3. Verificar Configuración

Abre `.env.local` y verifica que tenga:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
```

**Importante:** Reinicia el servidor después de modificar `.env.local`

### 4. Probar

1. **Registra una cuenta nueva:**
   - Email
   - Contraseña (mínimo 6 caracteres)
   - Nombre de la barbería
   
2. **Deberías poder iniciar sesión inmediatamente**

## ✅ Verificación

Ejecuta esto en Supabase SQL Editor para verificar:

```sql
-- Ver todas las tablas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Deberías ver: barbershops, services, user_profiles

-- Ver todas las funciones
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Deberías ver: create_barbershop_on_signup, get_barbers_with_emails, get_user_role

-- Ver políticas críticas para login
SELECT policyname FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
  AND policyname = 'Users can view own profile';

-- Deberías ver: Users can view own profile
```

## 🐛 Si Sigue Sin Funcionar

### Verificar Usuario en Base de Datos

```sql
-- Ver si tu usuario tiene perfil
SELECT 
  u.email,
  u.id as user_id,
  up.role,
  up.barbershop_id,
  b.name as barberia
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.barbershops b ON b.id = up.barbershop_id
WHERE u.email = 'TU_EMAIL@ejemplo.com'; -- ⚠️ CAMBIA ESTO
```

**Si `role` es NULL:**
- Ejecuta `ARREGLAR_USUARIOS_EXISTENTES.sql` con tu email

### Verificar Política RLS

```sql
-- Verificar que la política existe
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
  AND policyname = 'Users can view own profile';
```

**Debe retornar una fila con:**
- `cmd = SELECT`
- `qual` debe contener `user_id = auth.uid()`

## 🔧 Cambios en el Código

El código ahora está **completamente simplificado**:

- ✅ Login directo sin timeouts complejos
- ✅ Registro simplificado
- ✅ getProfile sin complejidad innecesaria
- ✅ Mejor manejo de errores
- ✅ Logs más claros

## 📝 Notas

1. **Si activas verificación de email:** Los usuarios necesitarán verificar antes de hacer login
2. **La función RPC es crítica:** Asegúrate de que `create_barbershop_on_signup` existe
3. **Si falla algo:** Revisa la consola del navegador (F12) para ver logs detallados

## 🎯 Orden de Ejecución

1. ✅ `SUPABASE_SETUP_DEFINITIVO.sql` → Ejecutar primero
2. ✅ `ARREGLAR_USUARIOS_EXISTENTES.sql` → Si tienes usuarios sin perfil
3. ✅ Verificar `.env.local` → Configuración correcta
4. ✅ Reiniciar servidor → `npm run dev`
5. ✅ Probar registro y login

