# ⚡ Solución Rápida: "Invalid login credentials" en Netlify

## 🔍 Diagnóstico Actual
- ✅ Variables de entorno configuradas correctamente
- ✅ URL de Supabase: `https://vkctuaqcldkbgazsghwu.supabase.co`
- ❌ Error: `400 Invalid login credentials`
- ❌ Email usado: `naimpaz274@gmail.com`

## 🎯 Causas Más Probables

### 1. El usuario NO existe en ese proyecto de Supabase ⚠️ (MÁS COMÚN)

**Síntoma:** Funciona localmente pero no en Netlify

**Causa:** El usuario `naimpaz274@gmail.com` no existe en el proyecto `vkctuaqcldkbgazsghwu.supabase.co`

**Solución:**
1. Ve a tu sitio en Netlify
2. Haz clic en **"Registrarse"** (no login)
3. Usa el email: `naimpaz274@gmail.com`
4. Crea una contraseña nueva
5. Intenta login con esas credenciales

---

### 2. El proyecto de Supabase es diferente ⚠️

**Síntoma:** Funciona localmente con un proyecto, pero Netlify usa otro

**Causa:** La URL en Netlify apunta a un proyecto diferente

**Solución:**
1. Abre tu archivo `.env.local` local
2. Copia el valor de `VITE_SUPABASE_URL`
3. Compara con la URL en Netlify:
   - Netlify: `https://vkctuaqcldkbgazsghwu.supabase.co`
   - Local: `https://???`
4. **Si son diferentes:**
   - Actualiza `VITE_SUPABASE_URL` en Netlify con la URL de tu `.env.local`
   - También actualiza `VITE_SUPABASE_ANON_KEY` con la key del mismo proyecto
   - Redesplega

---

### 3. La contraseña es diferente

**Síntoma:** El usuario existe pero la contraseña no funciona

**Solución:**
1. **Opción A:** Resetea la contraseña
   - Ve a tu sitio en Netlify
   - Haz clic en "¿Olvidaste tu contraseña?"
   - Sigue las instrucciones

2. **Opción B:** Crea un usuario nuevo
   - Regístrate con un email diferente
   - O regístrate nuevamente con el mismo email

---

## ✅ Pasos para Solucionar (Elige según tu caso)

### Opción 1: Verificar si el usuario existe

1. Ve a **Supabase Dashboard** → Proyecto `vkctuaqcldkbgazsghwu`
2. **SQL Editor**
3. Ejecuta `VERIFICAR_USUARIO_NETLIFY.sql`
4. El script te dirá:
   - ✅ Si el usuario existe
   - ⚠️ Si falta el perfil
   - ❌ Si no existe (necesitas registrarte)

---

### Opción 2: Registrar el usuario en producción

**Si el script dice que el usuario NO existe:**

1. Ve a tu sitio en Netlify
2. Haz clic en **"Registrarse"** (no "Iniciar sesión")
3. Completa el formulario:
   - Email: `naimpaz274@gmail.com`
   - Contraseña: (la que quieras usar)
   - Nombre de barbería: (el que quieras)
4. Después de registrarte, intenta login

---

### Opción 3: Usar el mismo proyecto que localmente

**Si quieres usar el mismo proyecto que funciona localmente:**

1. Abre `.env.local` en tu proyecto local
2. Copia estos valores:
   ```
   VITE_SUPABASE_URL=???
   VITE_SUPABASE_ANON_KEY=???
   ```
3. Ve a **Netlify** → Tu sitio → **Environment variables**
4. Actualiza:
   - `VITE_SUPABASE_URL` = (valor de tu `.env.local`)
   - `VITE_SUPABASE_ANON_KEY` = (valor de tu `.env.local`)
5. **Save**
6. **Redesplega:** Deploys → ⋯ → Trigger deploy → Clear cache

---

## 📋 Checklist de Verificación

- [ ] Ejecuté `VERIFICAR_USUARIO_NETLIFY.sql` en Supabase
- [ ] El usuario existe → Verifiqué contraseña
- [ ] El usuario NO existe → Me registré desde Netlify
- [ ] Comparé URL de Supabase local vs Netlify
- [ ] Son iguales → Mismo proyecto
- [ ] Son diferentes → Actualicé variables en Netlify
- [ ] Redesplegué después de cambios
- [ ] Probé login nuevamente

---

## 🆘 Si Nada Funciona

### Prueba con un usuario nuevo:
1. Ve a tu sitio en Netlify
2. Regístrate con un email nuevo (ej: `test@ejemplo.com`)
3. Si funciona → El problema es que `naimpaz274@gmail.com` no existe
4. Si NO funciona → Hay otro problema (políticas RLS, etc.)

### Verifica políticas RLS:
1. Ejecuta `SUPABASE_TODO_EN_UNO.sql` en Supabase SQL Editor
2. Esto recrea todas las políticas necesarias

---

## 💡 Recomendación

**La solución más rápida:**
1. Ve a tu sitio en Netlify
2. Haz clic en **"Registrarse"**
3. Usa: `naimpaz274@gmail.com`
4. Crea una contraseña
5. Intenta login

Esto creará el usuario en el proyecto de producción y debería funcionar inmediatamente.

