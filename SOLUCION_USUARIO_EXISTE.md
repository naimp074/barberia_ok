# 🔍 Solución: Usuario Existe pero Login Falla

## ✅ Confirmación
- ✅ Usuario existe: `naimpaz274@gmail.com`
- ✅ Email confirmado: `true`
- ✅ Tiene perfil: `✔ Tiene perfil`
- ❌ Pero login falla con: `400 Invalid login credentials`

## 🎯 Posibles Causas

### 1. Contraseña Incorrecta ⚠️ (MÁS PROBABLE)

**Síntoma:** El usuario existe pero la contraseña no funciona

**Solución A: Resetear Contraseña**
1. Ve a tu sitio en Netlify
2. Agrega un botón "¿Olvidaste tu contraseña?" si no lo tienes
3. O ve a Supabase Dashboard → **Authentication** → **Users**
4. Busca `naimpaz274@gmail.com`
5. Haz clic en los tres puntos (⋯) → **Send password reset email**
6. Revisa tu email y sigue las instrucciones

**Solución B: Cambiar Contraseña desde Supabase**
1. Ve a Supabase Dashboard → **Authentication** → **Users**
2. Busca `naimpaz274@gmail.com`
3. Haz clic en el usuario
4. En **Password**, haz clic en **Reset password**
5. Se enviará un email para resetear

---

### 2. Proyecto de Supabase Diferente ⚠️

**Síntoma:** El usuario existe en un proyecto, pero Netlify usa otro

**Verificar:**
1. Abre tu archivo `.env.local` local
2. Copia la `VITE_SUPABASE_URL`
3. Compara con la URL que aparece en la consola de Netlify:
   - Consola muestra: `https://vkctuaqcldkbgazsghwu.supabase.co`
   - Tu `.env.local`: `https://???`

**Si son diferentes:**
- El usuario existe en un proyecto pero Netlify apunta a otro
- **Solución:** Actualiza las variables en Netlify para que apunten al mismo proyecto

---

### 3. Email No Confirmado (Aunque el SQL dice que sí)

**Verificar:**
Ejecuta `DIAGNOSTICO_CONTRASEÑA.sql` en Supabase SQL Editor

**Si el email no está confirmado:**
1. Ve a Supabase Dashboard → **Authentication** → **Settings**
2. Desactiva **"Confirm email"** temporalmente
3. Guarda los cambios
4. Intenta login nuevamente

---

### 4. Usuario Banneado o Bloqueado

**Verificar:**
Ejecuta `DIAGNOSTICO_CONTRASEÑA.sql` para ver el estado

**Si está baneado:**
1. Ve a Supabase Dashboard → **Authentication** → **Users**
2. Busca `naimpaz274@gmail.com`
3. Si muestra "Banned", desbanea el usuario

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar Proyecto de Supabase

**Compara URLs:**

1. **Local:**
   - Abre `.env.local`
   - Copia `VITE_SUPABASE_URL`
   - Ejemplo: `https://abcdefgh.supabase.co`

2. **Netlify (consola del navegador):**
   - Abre la consola (F12)
   - Busca: `[Supabase Config] VITE_SUPABASE_URL:`
   - Ejemplo: `https://vkctuaqcldkbgazsghwu.supabase.co`

3. **¿Son iguales?**
   - ✅ **Sí** → Ve al Paso 2
   - ❌ **No** → **AHÍ ESTÁ EL PROBLEMA**
     - Actualiza `VITE_SUPABASE_URL` en Netlify con la URL de tu `.env.local`
     - También actualiza `VITE_SUPABASE_ANON_KEY`
     - Redesplega

---

### Paso 2: Resetear Contraseña

**Opción A: Desde la App (Recomendado)**
1. Ve a tu sitio en Netlify
2. Agrega funcionalidad de "¿Olvidaste tu contraseña?"
3. O crea un usuario nuevo temporalmente

**Opción B: Desde Supabase Dashboard**
1. Ve a Supabase Dashboard → **Authentication** → **Users**
2. Busca `naimpaz274@gmail.com`
3. Haz clic en los tres puntos (⋯) → **Send password reset email**
4. Revisa tu email
5. Sigue el enlace para resetear la contraseña
6. Intenta login con la nueva contraseña

**Opción C: Cambiar Contraseña Manualmente**
1. Ve a Supabase Dashboard → **Authentication** → **Users**
2. Busca `naimpaz274@gmail.com`
3. Haz clic en el usuario
4. En la sección **Password**, puedes cambiar la contraseña directamente
5. Guarda los cambios
6. Intenta login con la nueva contraseña

---

### Paso 3: Verificar Estado del Usuario

Ejecuta `DIAGNOSTICO_CONTRASEÑA.sql` en Supabase SQL Editor:

```sql
-- Ver estado completo del usuario
SELECT 
  email,
  email_confirmed_at IS NOT NULL as email_confirmado,
  banned_until,
  CASE 
    WHEN banned_until IS NOT NULL THEN '❌ BANNEADO'
    WHEN email_confirmed_at IS NULL THEN '⚠️ Email NO confirmado'
    ELSE '✅ Activo'
  END as estado
FROM auth.users
WHERE email = 'naimpaz274@gmail.com';
```

**Si muestra problemas:**
- Email no confirmado → Desactiva "Confirm email" en Settings
- Usuario baneado → Desbanea desde el Dashboard

---

### Paso 4: Probar con Usuario Nuevo

**Para descartar problemas de configuración:**

1. Ve a tu sitio en Netlify
2. Regístrate con un email nuevo (ej: `test@ejemplo.com`)
3. Si el usuario nuevo funciona → El problema es específico de `naimpaz274@gmail.com`
4. Si el usuario nuevo NO funciona → Problema de configuración general

---

## 🎯 Solución Más Rápida

**Si el proyecto de Supabase es el correcto:**

1. Ve a Supabase Dashboard → **Authentication** → **Users**
2. Busca `naimpaz274@gmail.com`
3. Haz clic en los tres puntos (⋯) → **Send password reset email**
4. O cambia la contraseña directamente desde el Dashboard
5. Intenta login con la nueva contraseña

---

## 📋 Checklist de Verificación

- [ ] Comparé URL de Supabase local vs Netlify
- [ ] Son iguales → Mismo proyecto ✅
- [ ] Son diferentes → Actualicé variables en Netlify
- [ ] Ejecuté `DIAGNOSTICO_CONTRASEÑA.sql`
- [ ] Usuario no está baneado
- [ ] Email está confirmado
- [ ] Reseteé la contraseña desde Supabase Dashboard
- [ ] Probé login con nueva contraseña
- [ ] Si no funciona → Probé con usuario nuevo

---

## 💡 Recomendación Final

**La causa más probable es la contraseña incorrecta.**

**Solución más rápida:**
1. Ve a Supabase Dashboard → **Authentication** → **Users**
2. Busca `naimpaz274@gmail.com`
3. Haz clic en el usuario → Cambia la contraseña
4. Intenta login con la nueva contraseña

Si esto no funciona, entonces el problema es que Netlify está usando un proyecto de Supabase diferente al que tiene el usuario.

