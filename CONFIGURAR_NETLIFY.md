# 🚀 Configurar Variables de Entorno en Netlify

## ❌ Problema
Tu aplicación funciona localmente pero falla en Netlify con errores:
- `Failed to load resource: the server responded with a status of 400`
- `AuthApiError: Invalid login credentials`

**Causa:** Las variables de entorno no están configuradas en Netlify.

---

## ✅ Solución: Configurar Variables en Netlify

### Paso 1: Obtener tus credenciales de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **Settings** → **API**
3. Copia estos dos valores:
   - **Project URL** → Esta es tu `VITE_SUPABASE_URL`
   - **anon public** key → Esta es tu `VITE_SUPABASE_ANON_KEY`

### Paso 2: Configurar en Netlify

1. **Abre tu proyecto en Netlify:**
   - Ve a [Netlify Dashboard](https://app.netlify.com)
   - Selecciona tu sitio

2. **Ve a la configuración de variables:**
   - En el menú lateral, ve a **Site configuration** → **Environment variables**
   - O ve directamente a: `https://app.netlify.com/sites/TU_SITIO/configuration/env`

3. **Agrega las dos variables:**

   **Variable 1:**
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** `https://tu-proyecto.supabase.co` (tu Project URL de Supabase)
   - **Scopes:** Deja marcado "All scopes" o selecciona "Production", "Deploy previews", "Branch deploys" según necesites

   **Variable 2:**
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (tu anon public key de Supabase)
   - **Scopes:** Igual que arriba

4. **Guarda los cambios:**
   - Haz clic en **Save**

### Paso 3: Redesplegar

⚠️ **IMPORTANTE:** Después de agregar las variables, debes redesplegar tu sitio:

1. Ve a **Deploys** en el menú lateral
2. Haz clic en los tres puntos (⋯) del último deploy
3. Selecciona **Trigger deploy** → **Clear cache and deploy site**

   O simplemente:
   - Haz un nuevo commit y push a tu repositorio
   - Netlify redesplegará automáticamente

---

## 🔍 Verificar que Funciona

Después de redesplegar:

1. Abre tu sitio en Netlify
2. Abre la consola del navegador (F12)
3. Intenta hacer login
4. No deberías ver errores de "Failed to load resource" o "Invalid login credentials"

---

## 📝 Notas Importantes

### ⚠️ Nombres de Variables
Los nombres deben ser **exactamente**:
- `VITE_SUPABASE_URL` (no `SUPABASE_URL` ni `REACT_APP_SUPABASE_URL`)
- `VITE_SUPABASE_ANON_KEY` (no `SUPABASE_ANON_KEY`)

### 🔒 Seguridad
- **NUNCA** subas tu archivo `.env.local` a Git
- Las variables de Netlify son seguras y solo se exponen al código frontend (que es normal para la anon key)
- La `anon key` está diseñada para ser pública (pero solo en el frontend)

### 🌍 Scopes (Ámbitos)
- **Production:** Solo para el sitio en producción
- **Deploy previews:** Para previews de PRs
- **Branch deploys:** Para deploys de branches específicos
- **All scopes:** Para todos los ambientes

Recomendación: Usa **All scopes** para que funcione en todos los ambientes.

---

## 🐛 Si Aún No Funciona

### 1. Verifica que las variables estén correctas
- Copia y pega directamente desde Supabase Dashboard
- No agregues espacios extras
- No uses comillas

### 2. Verifica el deploy
- Ve a **Deploys** → Selecciona el último deploy
- Revisa los **Build logs**
- Busca si hay errores relacionados con `VITE_SUPABASE`

### 3. Limpia el caché
- En **Deploys**, haz **Trigger deploy** → **Clear cache and deploy site**

### 4. Verifica en la consola del navegador
- Abre la consola (F12)
- Ve a la pestaña **Console**
- Busca errores relacionados con Supabase
- Si ves `undefined` en las URLs, las variables no están configuradas correctamente

---

## ✅ Checklist

- [ ] Obtuve `VITE_SUPABASE_URL` de Supabase Dashboard
- [ ] Obtuve `VITE_SUPABASE_ANON_KEY` de Supabase Dashboard
- [ ] Agregué ambas variables en Netlify Environment Variables
- [ ] Los nombres de las variables son exactamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- [ ] Redesplegué el sitio después de agregar las variables
- [ ] Probé el login y funciona correctamente

---

## 🎉 ¡Listo!

Una vez configuradas las variables y redesplegado, tu aplicación debería funcionar igual que localmente.

