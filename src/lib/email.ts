import emailjs from '@emailjs/browser';

// Inicializar EmailJS con las credenciales de entorno
// El usuario necesita configurar estas variables en .env.local
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

interface InviteEmailParams {
  toEmail: string;
  inviteLink: string;
  password: string;
}

export async function sendInviteEmail({ toEmail, inviteLink, password }: InviteEmailParams): Promise<void> {
  // Si EmailJS no está configurado, mostrar un mensaje y simular el envío
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS no está configurado. Para habilitar el envío de correos:');
    console.warn('1. Crea una cuenta en https://www.emailjs.com');
    console.warn('2. Crea un servicio de email y una plantilla');
    console.warn('3. Agrega las variables VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID y VITE_EMAILJS_PUBLIC_KEY a .env.local');
    console.warn('Datos de la invitación:', { toEmail, inviteLink, password });
    
    // En desarrollo, simular éxito
    return Promise.resolve();
  }

  try {
    // Inicializar EmailJS
    emailjs.init(EMAILJS_PUBLIC_KEY);

    // Enviar el correo
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
}

