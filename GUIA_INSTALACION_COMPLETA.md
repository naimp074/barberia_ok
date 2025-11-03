# 🚀 Guía de Instalación Completa - Barbería FZ

Esta guía te ayudará a configurar completamente la aplicación desde cero.

## 📋 Pasos para Configurar

### 1. Configurar Supabase

#### 1.1 Crear Proyecto en Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Espera 1-2 minutos a que se configure

#### 1.2 Ejecutar el SQL
1. En el dashboard de Supabase, ve a **SQL Editor**
2. Abre el archivo `SUPABASE_COMPLETE_SETUP_FIXED.sql`
3. Copia **TODO** el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **RUN** (o `Ctrl+Enter`)
6. Deberías ver mensajes de éxito: `✅ Todas las tablas se crearon correctamente`

#### 1.3 Desactivar Confirmación de Email (Recomendado)
1. Ve a **Authentication** → **Settings**
2. En la sección **Email Auth**, desactiva **"Confirm email"**
3. Esto permite que los usuarios se registren sin verificar email inmediatamente

#### 1.4 Obtener Credenciales
1. Ve a **Settings** → **API**
2. Copia:
   - **Project URL** → Esta es tu `VITE_SUPABASE_URL`
   - **anon public** key → Esta es tu `VITE_SUPABASE_ANON_KEY`

### 2. Configurar el Proyecto

#### 2.1 Crear archivo `.env.local`
1. En la raíz del proyecto (donde está `package.json`)
2. Crea un archivo llamado `.env.local` (con el punto al inicio)
3. Agrega este contenido:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

**Importante**: Reemplaza con tus valores reales de Supabase

#### 2.2 Instalar Dependencias
```bash
npm install
```

#### 2.3 Iniciar el Servidor
```bash
npm run dev
```

**Importante**: Reinicia el servidor después de crear/modificar `.env.local`

## ✅ Verificación

### Verificar Base de Datos
Ejecuta en el SQL Editor de Supabase:

```sql
-- Ver todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Deberías ver: barbershops, user_profiles, services

-- Ver todas las funciones
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Deberías ver: get_barbers_with_emails, create_barbershop_on_signup, get_user_role

-- Ver políticas RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Deberías ver varias políticas para cada tabla
```

### Verificar la Aplicación
1. Abre `http://localhost:5173` (o el puerto que te indique)
2. Deberías ver el formulario de login/registro
3. Intenta registrarte con un nuevo email
4. Deberías poder iniciar sesión inmediatamente

## 🐛 Solución de Problemas

### Error: "Supabase no está configurado"
**Causa**: Falta el archivo `.env.local` o las variables están mal escritas

**Solución**:
1. Verifica que el archivo se llama exactamente `.env.local` (con el punto)
2. Verifica que está en la raíz del proyecto (mismo nivel que `package.json`)
3. Verifica que las variables se llaman exactamente: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
4. Reinicia el servidor después de crear/modificar el archivo

### Error: "Perfil no encontrado"
**Causa**: El usuario existe en `auth.users` pero no tiene perfil en `user_profiles`

**Solución**:
1. Si es una cuenta antigua, créale un perfil manualmente en Supabase
2. Si es una cuenta nueva, debería crearse automáticamente al registrarse
3. Verifica que la función `create_barbershop_on_signup` existe y funciona

### Error: "Error de permisos" al agregar servicios
**Causa**: Las políticas RLS están bloqueando la inserción

**Solución**:
1. Verifica que ejecutaste el SQL completo
2. Verifica que el usuario tiene un perfil con `barbershop_id` válido
3. Verifica las políticas en Supabase: `SELECT * FROM pg_policies WHERE tablename = 'services'`

### Error: "No se puede crear barbería"
**Causa**: La función `create_barbershop_on_signup` no existe o no tiene permisos

**Solución**:
1. Verifica que la función existe: 
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'create_barbershop_on_signup';
   ```
2. Si no existe, ejecuta el SQL completo nuevamente
3. Verifica que tiene permisos:
   ```sql
   SELECT grantee FROM information_schema.routine_privileges 
   WHERE routine_name = 'create_barbershop_on_signup';
   ```

### La aplicación se queda en "Cargando..."
**Causa**: Hay un error en la carga inicial o problemas de conexión

**Solución**:
1. Abre la consola del navegador (F12)
2. Revisa los errores en la consola
3. Verifica que Supabase está accesible
4. Verifica que las credenciales en `.env.local` son correctas

## 📝 Notas Importantes

- **NO subas `.env.local` a Git** (ya está en `.gitignore`)
- **NO compartas tus claves** de Supabase públicamente
- Las políticas RLS son **esenciales** para la seguridad
- El timeout de seguridad es de 2 segundos para login rápido
- Los logs de diagnóstico están habilitados (revisa la consola del navegador)

## 🔄 Si Necesitas Empezar de Nuevo

Si necesitas eliminar todo y empezar desde cero:

1. En Supabase SQL Editor, descomenta estas líneas al inicio del SQL:
```sql
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.barbershops CASCADE;
DROP FUNCTION IF EXISTS public.get_barbers_with_emails(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_barbershop_on_signup(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
```

2. Ejecuta el SQL completo nuevamente

## 📞 Soporte

Si sigues teniendo problemas:
1. Abre la consola del navegador (F12)
2. Copia los mensajes de error
3. Revisa los logs en Supabase Dashboard > Logs > Postgres Logs
4. Comparte los errores específicos para obtener ayuda

