# 🔍 Diagnóstico de Problemas en Netlify

## ❌ Error que ves:
```
Failed to load resource: the server responded with a status of 400
AuthApiError: Invalid login credentials
```

## 🔎 Posibles Causas

### 1. Variables de Entorno Incorrectas ⚠️ (MÁS COMÚN)

**Síntoma:** Funciona localmente pero no en Netlify

**Solución:**
1. Ve a **Netlify Dashboard** → Tu sitio → **Environment variables**
2. Verifica que tengas exactamente:
   - `VITE_SUPABASE_URL` (no `SUPABASE_URL` ni `REACT_APP_SUPABASE_URL`)
   - `VITE_SUPABASE_ANON_KEY` (no `SUPABASE_ANON_KEY`)
3. **Verifica que los valores sean correctos:**
   - La URL debe ser: `https://tu-proyecto.supabase.co`
   - La KEY debe empezar con: `eyJ...` (es un JWT)
4. **NO dejes espacios** antes o después del valor
5. **NO uses comillas** alrededor del valor
6. **Redesplega** después de cambiar las variables

---

### 2. URL de Supabase Apunta a Otro Proyecto

**Síntoma:** Funciona localmente con un proyecto, pero en Netlify apunta a otro

**Solución:**
1. Verifica que la `VITE_SUPABASE_URL` en Netlify sea la misma que usas localmente
2. Compara:
   - Local: Abre `.env.local` y copia la URL
   - Netlify: Ve a Environment variables y compara

---

### 3. Anon Key Incorrecta

**Síntoma:** La URL es correcta pero la autenticación falla

**Solución:**
1. Ve a **Supabase Dashboard** → **Settings** → **API**
2. Copia la **anon public** key nuevamente
3. Pégala en Netlify (sin espacios, sin comillas)
4. Redesplega

---

### 4. Usuario No Existe en Producción

**Síntoma:** El usuario existe localmente pero no en el proyecto de producción

**Solución:**
1. Verifica que estés usando el mismo proyecto de Supabase en local y Netlify
2. Si son proyectos diferentes, crea el usuario en el proyecto de producción:
   - Regístrate nuevamente en el sitio de Netlify
   - O ejecuta el SQL para crear el usuario manualmente

---

### 5. Deploy No Incluye las Variables

**Síntoma:** Configuraste las variables pero el deploy anterior no las tiene

**Solución:**
1. **Redesplegar es obligatorio** después de agregar variables:
   - Ve a **Deploys**
   - Tres puntos (⋯) → **Trigger deploy** → **Clear cache and deploy site**

---

## ✅ Cómo Diagnosticar

### Paso 1: Revisar la Consola del Navegador

1. Abre tu sitio en Netlify
2. Abre la consola (F12)
3. Busca el mensaje: `[Supabase Config] === DIAGNÓSTICO ===`

**Deberías ver:**
```
[Supabase Config] === DIAGNÓSTICO ===
[Supabase Config] VITE_SUPABASE_URL: https://tu-proyecto.supabase.co...
[Supabase Config] VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
[Supabase Config] ✅ Configuración parece correcta
```

**Si ves:**
```
[Supabase Config] VITE_SUPABASE_URL: ❌ NO CONFIGURADA
[Supabase Config] VITE_SUPABASE_ANON_KEY: ❌ NO CONFIGURADA
```
→ Las variables no están configuradas en Netlify

**Si ves:**
```
[Supabase Config] ⚠️ URL DE SUPABASE INVÁLIDA
```
→ El formato de la URL es incorrecto

**Si ves:**
```
[Supabase Config] ⚠️ ANON KEY INVÁLIDA
```
→ El formato de la KEY es incorrecto

---

### Paso 2: Verificar Variables en Netlify

1. Ve a **Netlify Dashboard** → Tu sitio
2. **Site configuration** → **Environment variables**
3. Verifica:
   - ✅ Nombres exactos: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   - ✅ Sin espacios antes/después del `=`
   - ✅ Sin comillas
   - ✅ Valores correctos (copiados desde Supabase Dashboard)

---

### Paso 3: Comparar con Local

**Local (.env.local):**
```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Netlify (Environment variables):**
- Deben ser **exactamente iguales** (excepto si usas proyectos diferentes)

---

## 🛠️ Solución Paso a Paso

### 1. Verifica Variables en Netlify
```
Netlify Dashboard → Tu sitio → Environment variables
```

### 2. Verifica que los Nombres sean Correctos
```
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY

❌ NO:
   SUPABASE_URL
   REACT_APP_SUPABASE_URL
   VITE_SUPABASE_URL_ (con espacio o guión extra)
```

### 3. Obtén Valores Correctos desde Supabase
```
Supabase Dashboard → Settings → API
- Project URL → VITE_SUPABASE_URL
- anon public key → VITE_SUPABASE_ANON_KEY
```

### 4. Copia y Pega Exactamente
- Sin espacios
- Sin comillas
- Sin caracteres extra

### 5. Redesplega OBLIGATORIAMENTE
```
Deploys → ⋯ → Trigger deploy → Clear cache and deploy site
```

### 6. Prueba Nuevamente
- Abre la consola (F12)
- Revisa el diagnóstico
- Intenta hacer login

---

## 📋 Checklist de Verificación

- [ ] Variables configuradas en Netlify Environment variables
- [ ] Nombres exactos: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- [ ] Valores copiados desde Supabase Dashboard → Settings → API
- [ ] Sin espacios antes/después del valor
- [ ] Sin comillas alrededor del valor
- [ ] URL tiene formato: `https://xxx.supabase.co`
- [ ] KEY empieza con: `eyJ...`
- [ ] Redesplegado después de configurar variables
- [ ] Consola muestra: `[Supabase Config] ✅ Configuración parece correcta`
- [ ] Mismo proyecto de Supabase en local y Netlify

---

## 🆘 Si Nada Funciona

1. **Verifica que el proyecto de Supabase esté activo:**
   - Ve a Supabase Dashboard
   - Verifica que el proyecto no esté pausado

2. **Verifica que las políticas RLS estén correctas:**
   - Ejecuta `SUPABASE_TODO_EN_UNO.sql` nuevamente

3. **Prueba con un usuario nuevo:**
   - Regístrate desde el sitio de Netlify
   - Verifica que se cree correctamente

4. **Revisa los logs de Netlify:**
   - Ve a **Deploys** → Último deploy → **Build logs**
   - Busca errores relacionados con variables de entorno

---

## 💡 Tips Finales

- **Las variables de entorno solo se cargan al hacer build/deploy**
- **Redesplegar es obligatorio después de cambiar variables**
- **Usa "Clear cache" para asegurar un deploy limpio**
- **Compara siempre con tu configuración local**

