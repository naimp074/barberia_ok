// EmailJS está desactivado - La aplicación muestra los datos de invitación en un alert
// Para reactivarlo, descomenta el código y configura las variables de entorno

interface InviteEmailParams {
  toEmail: string;
  inviteLink: string;
  password: string;
}

/**
 * Función para enviar invitaciones por email.
 * EmailJS está desactivado - Los datos se muestran en un alert para que los copies manualmente.
 * 
 * Para reactivar EmailJS:
 * 1. Descomenta el import: import emailjs from '@emailjs/browser';
 * 2. Configura las variables de entorno en .env.local:
 *    - VITE_EMAILJS_SERVICE_ID
 *    - VITE_EMAILJS_TEMPLATE_ID
 *    - VITE_EMAILJS_PUBLIC_KEY
 * 3. Descomenta el código de envío de email
 */
export async function sendInviteEmail({ toEmail, inviteLink, password }: InviteEmailParams): Promise<void> {
  // EmailJS desactivado - Simular éxito
  // Los datos se mostrarán en un alert en Dashboard.tsx
  console.log('EmailJS desactivado. Datos de invitación:', { toEmail, inviteLink, password });
  return Promise.resolve();

  /* CÓDIGO DESACTIVADO - Para reactivar EmailJS, descomenta esto:
  
  const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS no está configurado. Mostrando datos en alert.');
    return Promise.resolve();
  }

  try {
    emailjs.init(EMAILJS_PUBLIC_KEY);

    const templateParams = {
      to_email: toEmail,
      invite_link: inviteLink,
      password: password,
      email: toEmail,
      subject: 'Invitación para unirte a la barbería',
      message: `Hola,

Has sido invitado a unirte a nuestra barbería. 

Tus credenciales son:
- Nombre de usuario (Email): ${toEmail}
- Contraseña temporal: ${password}

Por favor, haz clic en el siguiente enlace para registrarte:
${inviteLink}

Una vez que accedas, podrás cambiar tu contraseña desde tu perfil.

¡Esperamos verte pronto!`,
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    console.log('Correo enviado exitosamente a', toEmail);
  } catch (error) {
    console.error('Error enviando correo:', error);
    throw new Error('No se pudo enviar el correo electrónico. Por favor, verifica la configuración de EmailJS.');
  }
  */
}

