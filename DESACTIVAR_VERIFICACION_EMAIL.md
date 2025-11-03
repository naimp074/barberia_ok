# 📧 Desactivar Verificación de Email en Supabase

## 🔧 Pasos en Supabase Dashboard

### 1. Ir a Configuración de Authentication

1. Inicia sesión en [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** en el menú lateral
4. Haz clic en **Settings** (Configuración)

### 2. Desactivar Confirmación de Email

1. En la sección **Email Auth**, busca la opción **"Confirm email"**
2. **DESACTIVA el toggle** (debe estar en OFF/gris)
3. Guarda los cambios

### 3. Verificar Configuración

1. Desplázate hacia abajo hasta **Email Templates**
2. Verifica que los templates estén configurados (opcional, pero recomendado)

## ✅ Después de Desactivar

Una vez desactivada la verificación:

- ✅ Los usuarios se registran e **inician sesión inmediatamente**
- ✅ No necesitan verificar email
- ✅ El registro se completa automáticamente
- ✅ Pueden usar la app de inmediato

## 🔄 Si Ya Tienes Usuarios Sin Verificar

Si tienes usuarios registrados pero sin verificar, puedes verificar sus emails manualmente en Supabase:

1. Ve a **Authentication** → **Users**
2. Busca el usuario
3. Haz clic en los tres puntos (...)
4. Selecciona **"Confirm email"** o **"Send verification email"**

O mejor aún, simplemente haz que esos usuarios vuelvan a registrarse (el registro funcionará inmediatamente ahora).

## 📝 Nota Importante

- Esta configuración afecta a **todos los usuarios nuevos**
- Los usuarios existentes sin verificar seguirán sin poder hacer login hasta que verifiquen
- Si quieres que los usuarios existentes puedan hacer login, usa `ARREGLAR_USUARIOS_EXISTENTES.sql`

