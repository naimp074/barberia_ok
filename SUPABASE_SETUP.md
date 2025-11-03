# Configuración de Supabase para el Sistema de Barbería

Este documento explica cómo configurar Supabase con todas las tablas, políticas y permisos necesarios para el sistema.

## 📋 Requisitos Previos

1. Tener una cuenta de Supabase creada
2. Tener un proyecto de Supabase activo
3. Tener las credenciales de tu proyecto (URL y anon key)

## 🚀 Pasos para Configurar

### Opción 1: Usando el SQL Editor de Supabase (Recomendado)

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a https://app.supabase.com
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New query"

3. **Copia y pega el SQL completo**
   - Abre el archivo `supabase/migrations/20250101000000_complete_setup.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase

4. **Ejecuta la migración principal**
   - Haz clic en "Run" o presiona `Ctrl+Enter` (Windows/Linux) o `Cmd+Enter` (Mac)
   - Espera a que se ejecute completamente

5. **Ejecuta la migración de emails de barberos**
   - Abre otro query nuevo en SQL Editor
   - Abre el archivo `supabase/migrations/20250102000000_add_barber_emails_view.sql`
   - Copia y pega el contenido
   - Ejecuta con "Run"

6. **Ejecuta la migración para arreglar registro**
   - Abre otro query nuevo en SQL Editor
   - Abre el archivo `supabase/migrations/20250103000000_fix_registration.sql`
   - Copia y pega el contenido
   - Ejecuta con "Run"

7. **Configurar autenticación (IMPORTANTE para registro)**
   - Ve a Authentication > Settings en Supabase Dashboard
   - En "Email Auth", desactiva "Enable email confirmations" O configura email templates
   - Esto permite que los usuarios se registren sin confirmar email primero
   - Guarda los cambios

8. **Verifica que todo esté correcto**
   - Deberías ver el mensaje "Success. No rows returned" en ambas migraciones
   - Verifica en "Table Editor" que las tablas se crearon:
     - `barbershops`
     - `user_profiles`
     - `services`
   - Verifica en "Database" > "Functions" que existe:
     - `get_barbers_with_emails`

### Opción 2: Usando Supabase CLI

1. **Instala Supabase CLI** (si no lo tienes)
   ```bash
   npm install -g supabase
   ```

2. **Inicia sesión en Supabase**
   ```bash
   supabase login
   ```

3. **Vincula tu proyecto**
   ```bash
   supabase link --project-ref tu-project-ref
   ```

4. **Aplica las migraciones**
   ```bash
   supabase db push
   ```

## 📊 Estructura de Tablas

### `barbershops`
Almacena información de las barberías:
- `id` (uuid): Identificador único
- `name` (text): Nombre de la barbería
- `owner_user_id` (uuid): ID del dueño/admin principal
- `num_barbers` (integer): Número de barberos
- `created_at` (timestamptz): Fecha de creación

### `user_profiles`
Perfiles de usuario con rol y barbería:
- `user_id` (uuid): ID del usuario (FK a auth.users)
- `role` (text): Rol del usuario ('admin' o 'barber')
- `barbershop_id` (uuid): ID de la barbería (FK a barbershops)
- `created_at` (timestamptz): Fecha de creación

### `services`
Registros de servicios/cortes:
- `id` (uuid): Identificador único
- `user_id` (uuid): ID del usuario que creó el registro
- `barbershop_id` (uuid): ID de la barbería
- `barber_user_id` (uuid): ID del barbero que realizó el servicio
- `name` (text): Nombre del servicio (ej: "Corte", "Corte y barba")
- `price` (integer): Precio en CLP
- `timestamp` (timestamptz): Cuándo se realizó el servicio
- `created_at` (timestamptz): Fecha de creación del registro

## 🔒 Políticas de Seguridad (RLS)

El sistema implementa Row Level Security (RLS) para garantizar que:

1. **Barberos**:
   - Solo pueden ver sus propios servicios
   - Solo pueden crear servicios para sí mismos
   - Solo pueden eliminar sus propios servicios

2. **Admins**:
   - Pueden ver todos los servicios de su barbería
   - Pueden crear servicios para cualquier barbero de su barbería
   - Pueden eliminar cualquier servicio de su barbería
   - Pueden gestionar barberos y perfiles

3. **Usuarios**:
   - Solo pueden ver su propio perfil
   - Solo pueden crear su propio perfil

## 🧪 Verificación Post-Migración

Después de ejecutar la migración, verifica:

1. **Tablas creadas**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('barbershops', 'user_profiles', 'services');
   ```

2. **Políticas RLS activas**:
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('barbershops', 'user_profiles', 'services');
   ```

3. **Índices creados**:
   ```sql
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND tablename IN ('services', 'user_profiles');
   ```

## 📝 Notas Importantes

- **NO** ejecutes la migración dos veces en el mismo proyecto (usa `CREATE TABLE IF NOT EXISTS` para evitar errores)
- Si ya tienes datos en las tablas, las políticas se actualizarán pero los datos existentes permanecerán
- Asegúrate de que tu aplicación use las variables de entorno correctas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 🔧 Solución de Problemas

### Error: "relation already exists"
Si alguna tabla ya existe, el SQL usará `IF NOT EXISTS` para evitar errores. Si aún así tienes problemas, puedes:
1. Eliminar las tablas manualmente desde el Table Editor
2. Ejecutar la migración nuevamente

### Error: "policy already exists"
Las políticas usan `DROP POLICY IF EXISTS` antes de crearlas, así que deberían actualizarse sin problemas.

### Los datos no se filtran correctamente
Verifica que:
1. Los usuarios tengan perfiles creados en `user_profiles`
2. Los servicios tengan `barbershop_id` y `barber_user_id` correctos
3. Las políticas RLS estén activas (verificar con `SELECT * FROM pg_policies`)

## 📞 Soporte

Si encuentras algún problema, verifica:
1. Los logs en Supabase Dashboard > Logs > Postgres Logs
2. Las políticas activas en la tabla `pg_policies`
3. Que el usuario tenga el perfil correcto en `user_profiles`

---

**¡Listo!** Tu base de datos debería estar configurada correctamente. Ahora puedes usar tu aplicación con Supabase.

