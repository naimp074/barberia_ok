# Instrucciones para Configurar la Base de Datos en Supabase

## 📋 Pasos para Recrear la Base de Datos

### 1. Acceder a Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**

### 2. Ejecutar el Script Completo

1. Abre el archivo `SUPABASE_COMPLETE_SETUP.sql` que está en la raíz del proyecto
2. Copia **TODO** el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **RUN** (o presiona `Ctrl+Enter`)

### 3. Verificar la Instalación

Ejecuta estas consultas para verificar que todo se creó correctamente:

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
```

### 4. Configurar Email (IMPORTANTE)

Para que el registro funcione correctamente:

1. Ve a **Authentication** → **Settings** en el dashboard de Supabase
2. En la sección **Email Auth**, desactiva **"Confirm email"** (o configúralo según tus necesidades)
3. Si mantienes la confirmación de email activa, los usuarios deberán verificar su email antes de poder iniciar sesión

### 5. Verificar Variables de Entorno

Asegúrate de que tu archivo `.env.local` tenga:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon
```

Puedes encontrar estos valores en:
- **Settings** → **API** en el dashboard de Supabase

## 🔍 Estructura de la Base de Datos

### Tablas

#### `barbershops`
- Almacena información de cada barbería
- Campos: `id`, `name`, `owner_user_id`, `num_barbers`, `created_at`

#### `user_profiles`
- Perfiles de usuarios con su rol y barbería asociada
- Campos: `user_id`, `role` ('admin' o 'barber'), `barbershop_id`, `created_at`

#### `services`
- Registros de servicios/cortes realizados
- Campos: `id`, `user_id`, `barbershop_id`, `barber_user_id`, `name`, `price`, `timestamp`, `created_at`

### Funciones

- **`create_barbershop_on_signup`**: Crea automáticamente la barbería y el perfil de admin cuando un usuario se registra
- **`get_barbers_with_emails`**: Obtiene la lista de barberos con sus emails (solo para miembros de la barbería)
- **`get_user_role`**: Obtiene el rol del usuario actual en una barbería

### Políticas de Seguridad (RLS)

- **Barberos**: Solo pueden ver y gestionar sus propios servicios
- **Admins**: Pueden ver todos los servicios de su barbería y gestionar barberos

## ⚠️ Si Necesitas Empezar de Nuevo

Si necesitas eliminar todo y empezar desde cero, descomenta las líneas al inicio del archivo SQL:

```sql
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.barbershops CASCADE;
DROP FUNCTION IF EXISTS public.get_barbers_with_emails(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.create_barbershop_on_signup(uuid, text, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
```

Luego ejecuta el script completo nuevamente.

## 🐛 Solución de Problemas

### Error: "function does not exist"
- Asegúrate de ejecutar TODO el script completo
- Verifica que no haya errores en la consola de Supabase

### Error: "permission denied"
- Verifica que las políticas RLS estén creadas correctamente
- Revisa que las funciones tengan `SECURITY DEFINER`

### El registro se queda trabado
- Verifica que la función `create_barbershop_on_signup` esté creada
- Revisa los logs en la consola del navegador (F12)
- Asegúrate de que el email no requiera confirmación o que el usuario haya verificado su email

## 📝 Notas Importantes

- **NO elimines** las tablas manualmente sin usar el script SQL
- Las políticas RLS son **esenciales** para la seguridad
- El script usa `IF NOT EXISTS` y `DROP POLICY IF EXISTS` para evitar errores si ejecutas múltiples veces
- Todas las funciones tienen `SECURITY DEFINER` para poder acceder a `auth.users` cuando sea necesario

