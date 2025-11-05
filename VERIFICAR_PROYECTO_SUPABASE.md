# 🔍 Verificar Proyecto de Supabase

## ❌ Problema Actual
- ✅ Variables de entorno configuradas correctamente en Netlify
- ❌ Error: `400 Invalid login credentials`
- ❌ El login funciona localmente pero NO en Netlify

## 🎯 Causa Más Probable
**El proyecto de Supabase en Netlify es DIFERENTE al que usas localmente.**

---

## ✅ SOLUCIÓN: Verificar Proyecto

### Paso 1: Comparar URLs

**En tu archivo local `.env.local`:**
```env
VITE_SUPABASE_URL=https://???.supabase.co
```

**En Netlify (Environment variables):**
```
VITE_SUPABASE_URL=https://vkctuaqcldkbgazsghwu.supabase.co
```

**¿Son iguales?**
- ✅ Si son iguales → Ve al Paso 2
- ❌ Si son diferentes → **AHÍ ESTÁ EL PROBLEMA**

---

### Paso 2: Verificar Usuario en Producción

**Opción A: El usuario NO existe en producción**

Si el proyecto de Supabase es el mismo pero el usuario no existe:

1. **Regístrate desde el sitio de Netlify:**
   - Ve a tu sitio en Netlify
   - Haz clic en "Registrarse"
   - Usa el mismo email: `naimpaz274@gmail.com`
   - Crea una contraseña

2. **O ejecuta SQL para crear el usuario:**
   - Ve a Supabase Dashboard
   - SQL Editor
   - Ejecuta `ARREGLAR_PERFIL_RAPIDO.sql` con tu email

**Opción B: El usuario existe pero la contraseña es diferente**

1. **Resetea la contraseña:**
   - Ve a tu sitio en Netlify
   - Haz clic en "¿Olvidaste tu contraseña?"
   - Ingresa tu email
   - Sigue las instrucciones

2. **O crea un nuevo usuario:**
   - Regístrate con un email diferente
   - O cambia la contraseña desde Supabase Dashboard

---

## 🔧 Pasos para Solucionar

### Si la URL es diferente:

1. **Obtén la URL correcta:**
   - Abre tu archivo `.env.local` local
   - Copia el valor de `VITE_SUPABASE_URL`

2. **Actualiza en Netlify:**
   - Ve a Netlify Dashboard → Tu sitio
   - **Environment variables**
   - Edita `VITE_SUPABASE_URL`
   - Pega la URL correcta (la misma que usas localmente)
   - **Save**

3. **Actualiza también la KEY:**
   - Ve a Supabase Dashboard del proyecto que usas localmente
   - **Settings** → **API**
   - Copia la **anon public** key
   - Actualiza `VITE_SUPABASE_ANON_KEY` en Netlify con esta key

4. **Redesplega:**
   - **Deploys** → ⋯ → **Trigger deploy** → **Clear cache and deploy site**

---

### Si la URL es la misma pero el usuario no existe:

1. **Regístrate desde Netlify:**
   - Ve a tu sitio en Netlify
   - Haz clic en "Registrarse"
   - Usa: `naimpaz274@gmail.com`
   - Crea una contraseña

2. **O ejecuta SQL:**
   - Ve a Supabase Dashboard
   - SQL Editor
   - Abre `ARREGLAR_PERFIL_RAPIDO.sql`
   - Cambia el email si es necesario
   - Ejecuta el script

---

## 📋 Checklist de Verificación

- [ ] Comparé `VITE_SUPABASE_URL` de local vs Netlify
- [ ] Son iguales → El proyecto es el mismo
- [ ] Son diferentes → Actualicé la URL en Netlify
- [ ] Verifiqué que el usuario existe en Supabase (Authentication → Users)
- [ ] Si no existe → Me registré desde Netlify o ejecuté SQL
- [ ] Redesplegué después de cambiar variables
- [ ] Probé login nuevamente

---

## 🆘 Si Nada Funciona

1. **Crea un usuario de prueba:**
   - Ve a tu sitio en Netlify
   - Regístrate con un email nuevo (ej: `test@ejemplo.com`)
   - Verifica que funcione

2. **Si el usuario de prueba funciona:**
   → El problema es que `naimpaz274@gmail.com` no existe en ese proyecto
   → Regístrate nuevamente con ese email o usa otro

3. **Si el usuario de prueba NO funciona:**
   → Revisa las políticas RLS en Supabase
   → Ejecuta `SUPABASE_TODO_EN_UNO.sql` nuevamente

