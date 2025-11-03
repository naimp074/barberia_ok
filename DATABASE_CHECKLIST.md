# Checklist de Verificación de Base de Datos

## ✅ Verificaciones Previas a la Ejecución

### 1. Variables de Entorno
- [ ] Archivo `.env.local` creado
- [ ] `VITE_SUPABASE_URL` configurado
- [ ] `VITE_SUPABASE_ANON_KEY` configurado

### 2. Migraciones SQL
- [ ] Ejecutada migración: `20250101000000_complete_setup.sql`
- [ ] Ejecutada migración: `20250102000000_add_barber_emails_view.sql`
- [ ] Sin errores en la ejecución

### 3. Tablas Creadas
Verificar en Supabase Dashboard > Table Editor:
- [ ] `barbershops` existe
- [ ] `user_profiles` existe
- [ ] `services` existe

### 4. Funciones Creadas
Verificar en Supabase Dashboard > Database > Functions:
- [ ] `get_user_role` existe
- [ ] `get_barbers_with_emails` existe

### 5. Políticas RLS Verificadas
Verificar en Supabase Dashboard > Authentication > Policies:

**barbershops:**
- [ ] "Users can view own barbershop by membership"
- [ ] "Owner can manage own barbershop"

**user_profiles:**
- [ ] "Users can view own profile"
- [ ] "Users can insert own profile"
- [ ] "Admins can insert profiles for barbers"
- [ ] "Admins can update profiles in own barbershop"

**services:**
- [ ] "Members can read services"
- [ ] "Barbers can insert own services"
- [ ] "Admins can insert services for barbers"
- [ ] "Barbers can delete own services"
- [ ] "Admins can delete services in own barbershop"

## 🧪 Pruebas Funcionales

### Registro de Admin
1. [ ] Crear cuenta nueva con email y contraseña
2. [ ] Ingresar nombre de barbería y número de barberos
3. [ ] Verificar que se creó:
   - Usuario en auth.users
   - Barbería en barbershops
   - Perfil admin en user_profiles

### Login
1. [ ] Iniciar sesión con credenciales creadas
2. [ ] Verificar que carga el dashboard
3. [ ] Verificar que muestra el nombre de la barbería

### Crear Barbero
1. [ ] Como admin, crear un nuevo barbero
2. [ ] Verificar que se creó:
   - Usuario en auth.users
   - Perfil barber en user_profiles
3. [ ] Verificar que aparece en la lista de barberos

### Registrar Servicio
1. [ ] Como admin, registrar un servicio
2. [ ] Verificar que aparece en la lista de servicios
3. [ ] Verificar que tiene barbershop_id y barber_user_id correctos

### Iniciar Sesión como Barbero
1. [ ] Cerrar sesión del admin
2. [ ] Iniciar sesión con credenciales del barbero
3. [ ] Verificar que solo ve sus propios servicios
4. [ ] Registrar un nuevo servicio
5. [ ] Verificar que solo puede ver sus servicios

### Analíticas (Admin)
1. [ ] Iniciar sesión como admin
2. [ ] Ir a pestaña "Analíticas"
3. [ ] Verificar que muestra:
   - Resumen general (Hoy, Semana, Mes, Año)
   - Tabla de cortes por barbero
   - Calendario con resumen mensual

### Eliminación
1. [ ] Como admin, eliminar un servicio
2. [ ] Verificar que se eliminó correctamente
3. [ ] Como barbero, eliminar su propio servicio
4. [ ] Verificar que no puede eliminar servicios de otros

## 🔍 Verificación de Consultas SQL

Ejecutar estas consultas en SQL Editor para verificar datos:

```sql
-- Ver todas las barberías
SELECT * FROM public.barbershops;

-- Ver todos los perfiles
SELECT * FROM public.user_profiles;

-- Ver todos los servicios
SELECT * FROM public.services ORDER BY timestamp DESC;

-- Contar servicios por barbero
SELECT 
  barber_user_id,
  COUNT(*) as total_services,
  SUM(price) as total_revenue
FROM public.services
GROUP BY barber_user_id;

-- Verificar políticas activas
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

## ⚠️ Problemas Comunes y Soluciones

### Error: "new row violates row-level security policy"
**Causa:** Las políticas RLS están bloqueando la operación
**Solución:** Verificar que:
- El usuario está autenticado
- El usuario tiene el perfil correcto en user_profiles
- Las políticas están correctamente configuradas

### Error: "function get_barbers_with_emails does not exist"
**Causa:** La segunda migración no se ejecutó
**Solución:** Ejecutar `20250102000000_add_barber_emails_view.sql`

### Error: "permission denied for table auth.users"
**Causa:** La función intenta acceder a auth.users sin permisos
**Solución:** Verificar que la función usa `SECURITY DEFINER` y `SET search_path`

### Los barberos ven servicios de otros barberos
**Causa:** La política RLS no está filtrando correctamente
**Solución:** Verificar la política "Members can read services" en services

### No se pueden crear barberos
**Causa:** Falta la política para que admins inserten perfiles
**Solución:** Verificar que existe "Admins can insert profiles for barbers"

## 📝 Notas Finales

- La función `get_barbers_with_emails` requiere permisos especiales para acceder a `auth.users`
- Si hay problemas, verificar los logs en Supabase Dashboard > Logs > Postgres Logs
- Todas las consultas deben usar snake_case para nombres de columnas (barbershop_id, not barbershopId)
- Los tipos de servicio aún usan localStorage (no afecta la funcionalidad principal)

