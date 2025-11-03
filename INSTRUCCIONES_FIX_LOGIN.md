# 🔧 INSTRUCCIONES PARA ARREGLAR EL LOGIN

## 🚨 Pasos Obligatorios

### Paso 1: Ejecutar Script SQL

**Este es el paso MÁS IMPORTANTE.** Tu usuario probablemente no tiene perfil en la base de datos.

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Abre el archivo `SOLUCION_LOGIN_SIMPLE.sql`
3. Copia TODO el contenido
4. **REEMPLAZA** `'TU_EMAIL@ejemplo.com'` con tu email real (por ejemplo: `'naimpaz274@gmail.com'`)
5. Pega en el SQL Editor
6. Haz clic en **RUN**
7. Deberías ver mensajes de éxito: `✅ Usuario encontrado`, `✅ Perfil creado/actualizado`

### Paso 2: Verificar que Funcionó

Ejecuta esta consulta (reemplaza el email):

```sql
SELECT 
  u.email,
  CASE 
    WHEN up.user_id IS NULL THEN '❌ NO TIENE PERFIL'
    WHEN up.barbershop_id IS NULL THEN '❌ NO TIENE BARBERÍA'
    ELSE '✅ TODO CORRECTO'
  END as estado,
  up.role,
  b.name as barberia
FROM auth.users u
LEFT JOIN public.user_profiles up ON up.user_id = u.id
LEFT JOIN public.barbershops b ON b.id = up.barbershop_id
WHERE u.email = 'TU_EMAIL@ejemplo.com';
```

**Resultado esperado:** Deberías ver `✅ TODO CORRECTO`

### Paso 3: Probar Login

1. **Recarga completamente la página** (Ctrl+F5 o Cmd+Shift+R)
2. **Abre la consola** (F12 → Console)
3. **Intenta hacer login**
4. **Observa los mensajes** en la consola

Deberías ver:
- `[signInWithPassword] ========== INICIO LOGIN ==========`
- `[signInWithPassword] Paso 1: Autenticando con Supabase...`
- `[signInWithPassword] Usuario autenticado: [ID]`
- `[signInWithPassword] Paso 2: Obteniendo perfil...`
- `[signInWithPassword] Resultado de getProfile: ✅ Perfil encontrado`
- `[signInWithPassword] ========== LOGIN EXITOSO ==========`

## 🔍 Si Sigue Sin Funcionar

### Opción A: Verificar Políticas RLS

```sql
-- Ver todas las políticas para user_profiles
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';
```

**Debe existir:** `"Users can view own profile"`

Si no existe, ejecuta el archivo `SUPABASE_COMPLETE_SETUP_FIXED.sql` completo.

### Opción B: Verificar que Supabase Esté Configurado

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Verifica que tenga:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon
   ```
3. **Reinicia el servidor** después de modificar

### Opción C: Verificar Conexión

1. Abre la consola (F12)
2. Ve a la pestaña **Network**
3. Intenta hacer login
4. Busca requests a Supabase que fallen (rojos)
5. Comparte los errores que veas

## 📝 Checklist Rápido

- [ ] Ejecuté el script SQL `SOLUCION_LOGIN_SIMPLE.sql`
- [ ] Reemplacé el email en el script
- [ ] Vi mensajes de éxito en Supabase
- [ ] Verifiqué con la consulta de verificación
- [ ] Recargué completamente la página (Ctrl+F5)
- [ ] Abrí la consola (F12)
- [ ] Intenté hacer login
- [ ] Revisé los mensajes en la consola

## ⚠️ Error Común: "Perfil no encontrado"

Si ves este error, significa que:
1. El usuario existe en `auth.users`
2. Pero NO tiene registro en `user_profiles`

**Solución:** Ejecuta el script SQL del Paso 1. Eso creará automáticamente el perfil faltante.

## 💡 ¿Por Qué Pasa Esto?

Esto sucede cuando:
- El registro se completó pero falló la creación del perfil
- Hubo un error durante el registro inicial
- La base de datos se modificó manualmente y se borró el perfil
- Las políticas RLS bloquearon la creación del perfil

El script SQL soluciona todos estos casos.

