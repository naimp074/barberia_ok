# Configuración de EmailJS para Envío de Invitaciones

## Pasos para Configurar EmailJS

### 1. Crear cuenta en EmailJS
- Ve a https://www.emailjs.com
- Crea una cuenta gratuita (permite hasta 200 correos/mes)

### 2. Crear un Servicio de Email
- Ve a "Email Services" en el dashboard
- Haz clic en "Add New Service"
- Selecciona tu proveedor de email (Gmail, Outlook, etc.)
- Sigue las instrucciones para conectar tu cuenta de email
- Copia el **Service ID**

### 3. Crear una Plantilla de Email
- Ve a "Email Templates" en el dashboard
- Haz clic en "Create New Template"
- Configura la plantilla con estos campos:
  - **To Email**: `{{to_email}}`
  - **Subject**: `{{subject}}`
  - **Content**: 
```
{{message}}
```

O si prefieres una plantilla personalizada:

**Subject**: `{{subject}}`

**Body**:
```
Hola,

Has sido invitado a unirte a nuestra barbería. 

Tus credenciales son:
- Nombre de usuario (Email): {{email}}
- Contraseña temporal: {{password}}

Por favor, haz clic en el siguiente enlace para registrarte:
{{invite_link}}

Una vez que accedas, podrás cambiar tu contraseña desde tu perfil.

¡Esperamos verte pronto!
```

- Copia el **Template ID**

### 4. Obtener tu Public Key
- Ve a "Account" > "General"
- Copia tu **Public Key**

### 5. Configurar Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto con:

```env
VITE_EMAILJS_SERVICE_ID=tu_service_id
VITE_EMAILJS_TEMPLATE_ID=tu_template_id
VITE_EMAILJS_PUBLIC_KEY=tu_public_key
```

### 6. Reiniciar el servidor de desarrollo
Después de agregar las variables de entorno, reinicia el servidor:
```bash
npm run dev
```

## Nota
Si EmailJS no está configurado, la aplicación seguirá funcionando pero mostrará los datos de la invitación en un alert. Esto es útil para desarrollo y pruebas.

