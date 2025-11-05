# ⚡ Solución Rápida para Netlify

## ❌ NO hagas esto:
- ❌ Subir archivo `.env` a Git (no funcionará y es inseguro)
- ❌ Crear archivo `.env` en el repositorio (Netlify no lo lee)

## ✅ SOLUCIÓN CORRECTA (2 minutos):

### Paso 1: Obtén tus credenciales
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. **Settings** → **API**
3. Copia estos dos valores:
   - **Project URL** 
   - **anon public** key

### Paso 2: Configura en Netlify
1. Ve a [Netlify](https://app.netlify.com) → Tu sitio
2. **Site configuration** → **Environment variables**
3. Agrega estas dos variables:

   **Variable 1:**
   ```
   Key: VITE_SUPABASE_URL
   Value: https://tu-proyecto.supabase.co
   ```

   **Variable 2:**
   ```
   Key: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Save**

### Paso 3: Redesplegar
1. **Deploys** → Tres puntos (⋯) → **Trigger deploy** → **Clear cache and deploy site**

---

## 🎯 ¿Por qué no funciona subir `.env`?

1. **Git lo ignora:** `.env` está en `.gitignore` (por seguridad)
2. **Netlify no lo lee:** Netlify no lee archivos `.env` del repositorio
3. **Es inseguro:** Subir credenciales a Git es una mala práctica

**La única forma correcta es configurar las variables en el panel de Netlify.**

---

## ✅ Después de configurar:
- ✅ Tu app funcionará en Netlify
- ✅ Las credenciales estarán seguras
- ✅ No estarán en tu repositorio Git

