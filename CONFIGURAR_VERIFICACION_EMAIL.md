# 📧 Configurar Verificación de Email en Supabase

Esta guía te explica cómo configurar Supabase para que los usuarios deban verificar su email antes de poder iniciar sesión.

## 🔧 Pasos para Activar Verificación de Email

### 1. Ir a Configuración de Authentication en Supabase

1. Inicia sesión en [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication** en el menú lateral
4. Haz clic en **Settings** (Configuración)

### 2. Activar Confirmación de Email

1. En la sección **Email Auth**, busca la opción **"Confirm email"**
2. **Activa el toggle** para habilitar la confirmación de email
3. (Opcional) Configura el **Redirect URL** si quieres redirigir a una página específica después de verificar

### 3. Configurar Email Templates (Opcional pero Recomendado)

1. Ve a **Authentication** → **Email Templates**
2. Personaliza las plantillas de email si lo deseas:
   - **Confirm signup**: Email de confirmación de registro
   - **Magic Link**: Link mágico (si lo usas)
   - **Change Email Address**: Cambio de email

### 4. Verificar Configuración de SMTP

Supabase usa su propio servicio SMTP por defecto, pero puedes configurar uno personalizado:

1. En **Authentication** → **Settings**
2. Busca la sección **SMTP Settings**
3. Si quieres usar tu propio servidor SMTP, configúralo aquí
4. Si no, Supabase usará su servicio predeterminado (funciona bien para desarrollo)

## ✅ Verificación Rápida

Para verificar que está funcionando:

```sql
-- En Supabase SQL Editor, verifica usuarios no confirmados
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

Los usuarios nuevos deberían tener `email_confirmed_at` como `NULL` hasta que verifiquen su email.

## 🔄 Comportamiento de la Aplicación

Con la verificación de email activada:

1. **Al registrarse:**
   - El usuario se crea en Supabase Auth
   - La información de la barbería se guarda en `user_metadata`
   - Recibe un email de verificación
   - NO puede iniciar sesión hasta verificar
   - La barbería y perfil NO se crean todavía (se crearán cuando verifique)

2. **Al intentar iniciar sesión sin verificar:**
   - Recibirá un error: "Email not confirmed"
   - La aplicación mostrará: "Tu cuenta necesita ser verificada. Revisa tu email y haz clic en el enlace de verificación."

3. **Después de verificar:**
   - El usuario hace clic en el enlace del email
   - Es redirigido a Supabase (o tu URL configurada)
   - Su email queda verificado
   - Al iniciar sesión por primera vez:
     - La aplicación detecta que no tiene perfil
     - Automáticamente crea la barbería y perfil usando la información guardada
     - El usuario puede usar la aplicación normalmente

## 🎨 Personalizar el Email de Verificación

### Opción 1: Usando el Editor de Templates de Supabase

1. Ve a **Authentication** → **Email Templates**
2. Selecciona **"Confirm signup"**
3. Personaliza el contenido usando las variables disponibles:
   - `{{ .Email }}` - Email del usuario
   - `{{ .Token }}` - Token de verificación
   - `{{ .TokenHash }}` - Hash del token
   - `{{ .SiteURL }}` - URL de tu sitio
   - `{{ .ConfirmationURL }}` - URL de confirmación completa

### Opción 2: HTML Personalizado

Puedes usar HTML en las plantillas:

```html
<h1>Verifica tu cuenta</h1>
<p>Hola,</p>
<p>Gracias por registrarte en nuestra barbería.</p>
<p>Haz clic en el siguiente enlace para verificar tu email:</p>
<a href="{{ .ConfirmationURL }}">Verificar mi email</a>
<p>Si no solicitaste esta cuenta, ignora este email.</p>
```

## 🧪 Probar la Verificación

### Prueba Manual:

1. **Registra un nuevo usuario:**
   ```typescript
   // En la aplicación, registra con un email real
   ```

2. **Revisa tu bandeja de entrada:**
   - Deberías recibir un email de Supabase
   - El email contendrá un enlace de verificación

3. **Haz clic en el enlace:**
   - Serás redirigido a Supabase
   - Tu email quedará verificado
   - Verás un mensaje de confirmación

4. **Intenta iniciar sesión:**
   - Ahora debería funcionar correctamente

### Prueba Automática (Para Desarrollo):

Si estás en desarrollo y quieres saltar la verificación temporalmente:

```sql
-- Marcar un usuario como verificado manualmente (SOLO PARA DESARROLLO)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'tu-email@ejemplo.com';
```

## ⚠️ Importante

1. **En Desarrollo:**
   - Puedes desactivar temporalmente la verificación para desarrollo
   - Pero en producción, SIEMPRE debe estar activada

2. **URLs de Redirección:**
   - Configura correctamente las URLs permitidas
   - En **Authentication** → **URL Configuration**
   - Agrega tu dominio de producción

3. **Spam:**
   - Los emails pueden ir a spam inicialmente
   - Configura SPF/DKIM si usas SMTP personalizado

## 📝 Código de la Aplicación

El código actual maneja correctamente la verificación de email:

- ✅ Muestra mensaje claro cuando el usuario necesita verificar
- ✅ Detecta errores de "Email not confirmed"
- ✅ Guía al usuario a revisar su email
- ✅ **NUEVO:** Completa automáticamente el registro cuando el usuario verifica y hace login

### Mensajes que verá el usuario:

**Al registrarse (sin verificación):**
```
✅ Tu cuenta se creó exitosamente.

📧 Revisa tu email (y la carpeta de spam) para verificar tu cuenta.

Después de verificar tu email, podrás iniciar sesión y 
tu barbería se configurará automáticamente.
```

**Al intentar login sin verificar:**
```
Tu cuenta necesita ser verificada. 
Revisa tu email y haz clic en el enlace de verificación.
```

**Después de verificar y hacer login:**
- El sistema automáticamente detecta que falta el perfil
- Crea la barbería y perfil usando la información guardada
- El usuario puede usar la aplicación normalmente
- Todo esto sucede de forma transparente para el usuario

## 🔗 Referencias

- [Documentación de Supabase - Email Auth](https://supabase.com/docs/guides/auth/auth-email)
- [Supabase Dashboard](https://app.supabase.com)
- [Configuración de Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)

