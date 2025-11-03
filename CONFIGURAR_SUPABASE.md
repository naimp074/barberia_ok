# 🚀 Configurar Supabase - Guía Rápida

## El Error "La operación está tardando demasiado"

Este error aparece porque **Supabase no está configurado**. Necesitas crear un archivo de configuración.

## ✅ Pasos para Configurar

### 1. Crear el archivo `.env.local`

En la **raíz del proyecto** (donde está `package.json`), crea un archivo llamado `.env.local` con este contenido:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

### 2. Obtener tus credenciales de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 3. Ejemplo de archivo `.env.local`

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MjM5NjE2MywiZXhwIjoxOTU3OTcyMTYzfQ.EjemploDeClaveLargaAqui123456789
```

### 4. Reiniciar el servidor

**IMPORTANTE**: Después de crear o modificar `.env.local`, debes:

1. Detener el servidor de desarrollo (Ctrl+C)
2. Iniciarlo nuevamente con `npm run dev`

Las variables de entorno solo se cargan al iniciar el servidor.

## 📝 Verificar que Funciona

Después de configurar:

1. Reinicia el servidor
2. Intenta iniciar sesión o registrarte
3. Si sigue el error, abre la consola del navegador (F12) y revisa los mensajes

## ❓ ¿No tienes un proyecto Supabase?

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto
4. Espera a que se configure (1-2 minutos)
5. Obtén tus credenciales de **Settings → API**
6. Ejecuta el SQL de `SUPABASE_COMPLETE_SETUP.sql` en el SQL Editor

## 🔍 Solución de Problemas

### El error sigue apareciendo

1. **Verifica que el archivo se llama exactamente `.env.local`** (con el punto al inicio)
2. **Verifica que está en la raíz del proyecto** (mismo nivel que `package.json`)
3. **Reinicia el servidor** después de crear el archivo
4. **Abre la consola (F12)** para ver mensajes de error más específicos

### "Supabase no está configurado" en la consola

- Verifica que las variables tengan los nombres exactos: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- No dejes espacios alrededor del `=`
- No uses comillas a menos que el valor las necesite

### Error de conexión

- Verifica que las credenciales sean correctas
- Verifica que tu proyecto Supabase esté activo
- Verifica tu conexión a internet

## 📁 Estructura del Proyecto

```
barberiafz-main/
├── .env.local          ← CREA ESTE ARCHIVO AQUÍ
├── package.json
├── src/
└── ...
```

## ⚠️ Importante

- **NO subas `.env.local` a Git** (ya está en `.gitignore`)
- **NO compartas tus claves** públicamente
- El archivo `.env.local.example` es solo un ejemplo, NO lo uses directamente

