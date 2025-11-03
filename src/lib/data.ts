// Capa de datos usando Supabase
import { supabase } from './supabase';

export type Role = 'admin' | 'barber' | 'cashier' | 'auditor';

export interface UserLite {
  id: string;
  email: string;
  role: Role;
  barbershopId: string;
}

export interface Barbershop {
  id: string;
  name: string;
  ownerUserId: string;
  numBarbers: number;
}

export interface ServiceRecord {
  id: string;
  barbershopId: string;
  barberUserId: string;
  user_id?: string; // compat
  name: string;
  price: number;
  timestamp: string; // ISO
}

// ============================================
// AUTENTICACIÓN
// ============================================

export async function signUp(email: string, password: string, barbershopName: string, numBarbers: number = 1) {
  console.log('[signUp] Iniciando registro para:', email);
  
  // Crear usuario en Supabase Auth
  console.log('[signUp] Creando usuario en Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined, // No requiere redirección de email
      data: {
        barbershop_name: barbershopName,
        num_barbers: numBarbers,
      },
    },
  });

  if (authError) {
    console.error('[signUp] Error en signUp:', authError);
    throw new Error(authError.message || 'Error creando usuario');
  }

  if (!authData.user) {
    console.error('[signUp] Usuario no creado');
    throw new Error('Error: Usuario no creado');
  }

  const userId = authData.user.id;
  console.log('[signUp] Usuario creado con ID:', userId);

  // Verificar si hay sesión inmediatamente después del registro
  let session = authData.session;
  if (!session) {
    // Intentar obtener la sesión actual
    const { data: sessionData } = await supabase.auth.getSession();
    session = sessionData?.session || null;
  }

  // Si no hay sesión, puede ser que Supabase requiera confirmación de email
  // En ese caso, intentar iniciar sesión automáticamente (solo funciona si no requiere confirmación)
  if (!session) {
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!signInError && signInData.session) {
        session = signInData.session;
      } else if (signInError) {
        // Si falla el login, es probable que requiera confirmación de email
        console.warn('No hay sesión después del registro. Puede requerir confirmación de email.');
      }
    } catch (signInErr) {
      console.warn('Error intentando iniciar sesión después del registro:', signInErr);
    }
  }

  // Usar función SQL para crear barbería y perfil (evita problemas de RLS)
  try {
    console.log('[signUp] Intentando crear barbería usando función RPC...');
    const { data: barbershopId, error: functionError } = await supabase.rpc(
      'create_barbershop_on_signup',
      {
        p_user_id: userId,
        p_barbershop_name: barbershopName,
        p_num_barbers: numBarbers,
      }
    );

    if (functionError) {
      // Si la función no existe, intentar método directo
      console.warn('[signUp] Función no disponible, usando método directo:', functionError);
      
      // Si no hay sesión, mostrar un error claro
      if (!session) {
        throw new Error('Tu cuenta se creó exitosamente, pero necesitas verificar tu email antes de continuar. Revisa tu bandeja de entrada y haz clic en el enlace de verificación. Luego intenta iniciar sesión.');
      }

      // Crear barbería directamente
      console.log('[signUp] Creando barbería directamente...');
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: barbershopName,
          owner_user_id: userId,
          num_barbers: numBarbers,
        })
        .select()
        .single();

      if (shopError) {
        console.error('[signUp] Error creando barbería:', shopError);
        throw new Error(`Error creando barbería: ${shopError.message}`);
      }

      if (!shopData) {
        console.error('[signUp] No se pudo crear la barbería - shopData es null');
        throw new Error('No se pudo crear la barbería');
      }

      console.log('[signUp] Barbería creada con ID:', shopData.id);

      // Crear perfil de admin
      console.log('[signUp] Creando perfil de admin...');
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          role: 'admin',
          barbershop_id: shopData.id,
        });

      if (profileError) {
        console.error('[signUp] Error creando perfil:', profileError);
        await supabase.from('barbershops').delete().eq('id', shopData.id);
        throw new Error(`Error creando perfil: ${profileError.message}`);
      }

      console.log('[signUp] Perfil de admin creado exitosamente');

      // Si no hay sesión aún, lanzar error indicando que necesita verificar email
      if (!session) {
        throw new Error('Tu cuenta se creó exitosamente, pero necesitas verificar tu email antes de continuar. Revisa tu bandeja de entrada y haz clic en el enlace de verificación. Luego intenta iniciar sesión.');
      }

      return {
        user: {
          id: userId,
          email: authData.user.email || email,
          role: 'admin' as Role,
          barbershopId: shopData.id,
        },
        barbershop: {
          id: shopData.id,
          name: shopData.name,
          ownerUserId: shopData.owner_user_id,
          numBarbers: shopData.num_barbers,
        },
      };
    }

    // Obtener datos de la barbería creada
    console.log('[signUp] Barbería creada con ID (RPC):', barbershopId);
    console.log('[signUp] Obteniendo datos de la barbería...');
    const { data: shopData, error: fetchError } = await supabase
      .from('barbershops')
      .select('id, name, owner_user_id, num_barbers')
      .eq('id', barbershopId)
      .single();

    if (fetchError || !shopData) {
      console.error('[signUp] Error obteniendo datos de la barbería:', fetchError);
      throw new Error('Error obteniendo datos de la barbería');
    }

    console.log('[signUp] Datos de barbería obtenidos:', shopData);

    // Si no hay sesión después de crear todo, lanzar error indicando que necesita verificar email
    if (!session) {
      throw new Error('Tu cuenta se creó exitosamente, pero necesitas verificar tu email antes de continuar. Revisa tu bandeja de entrada y haz clic en el enlace de verificación. Luego intenta iniciar sesión.');
    }

    console.log('[signUp] Registro completado exitosamente');
    return {
      user: {
        id: userId,
        email: authData.user.email || email,
        role: 'admin' as Role,
        barbershopId: shopData.id,
      },
      barbershop: {
        id: shopData.id,
        name: shopData.name,
        ownerUserId: shopData.owner_user_id,
        numBarbers: shopData.num_barbers,
      },
    };
  } catch (err: any) {
    console.error('[signUp] Error completo en signUp:', err);
    throw err;
  }
}

export async function signInWithPassword({ email, password }: { email: string; password: string }) {
  console.log('[signInWithPassword] Iniciando login para:', email);
  
  // Usar Promise.all para hacer las operaciones en paralelo cuando sea posible
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[signInWithPassword] Error en auth:', error);
    throw new Error(error.message || 'Credenciales inválidas');
  }
  
  if (!data.user) {
    console.error('[signInWithPassword] Usuario no encontrado en respuesta');
    throw new Error('Error en autenticación');
  }

  console.log('[signInWithPassword] Usuario autenticado:', data.user.id);

  // Obtener perfil del usuario (solo lo necesario para login)
  console.log('[signInWithPassword] Obteniendo perfil...');
  const profile = await getProfile(data.user.id);
  
  if (!profile) {
    console.error('[signInWithPassword] Perfil no encontrado para usuario:', data.user.id);
    console.error('[signInWithPassword] Esto puede deberse a:');
    console.error('  1. El usuario no tiene un perfil creado en user_profiles');
    console.error('  2. Las políticas RLS están bloqueando el acceso');
    console.error('  3. El usuario no está asociado a una barbería');
    throw new Error('Perfil no encontrado. Tu cuenta no tiene un perfil configurado. Por favor, contacta al administrador o crea una nueva cuenta.');
  }

  console.log('[signInWithPassword] Perfil encontrado:', profile);

  return {
    user: {
      id: data.user.id,
      email: data.user.email || email,
      role: profile.role as Role,
      barbershopId: profile.barbershopId,
    },
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return { data: { session: null } };
    }
    
    if (!data.session?.user) {
      return { data: { session: null } };
    }

    try {
      const profile = await getProfile(data.session.user.id);
      if (!profile) {
        return { data: { session: null } };
      }

      return {
        data: {
          session: {
            user: {
              id: data.session.user.id,
              email: data.session.user.email || '',
              role: profile.role as Role,
              barbershopId: profile.barbershopId,
            },
          },
        },
      };
    } catch (profileError) {
      console.error('Error getting profile:', profileError);
      return { data: { session: null } };
    }
  } catch (err) {
    console.error('Error in getSession:', err);
    return { data: { session: null } };
  }
}

export function onAuthStateChange(
  cb: (event: 'SIGNED_IN' | 'SIGNED_OUT', session: { user: UserLite } | null) => void
) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (event === 'SIGNED_OUT' || !session?.user) {
        cb('SIGNED_OUT', null);
        return;
      }

      try {
        const profile = await getProfile(session.user.id);
        if (!profile) {
          cb('SIGNED_OUT', null);
          return;
        }

        cb('SIGNED_IN', {
          user: {
            id: session.user.id,
            email: session.user.email || '',
            role: profile.role as Role,
            barbershopId: profile.barbershopId,
          },
        });
      } catch (profileError) {
        console.error('Error getting profile in auth change:', profileError);
        cb('SIGNED_OUT', null);
      }
    } catch (err) {
      console.error('Error in auth state change:', err);
      cb('SIGNED_OUT', null);
    }
  });
}

export async function getProfile(userId: string) {
  try {
    console.log('[getProfile] Buscando perfil para usuario:', userId);
    
    // Usar select más específico y agregar límite para respuesta más rápida
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, barbershop_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    if (error) {
      // Si no se encuentra el perfil, no es necesariamente un error crítico
      if (error.code === 'PGRST116') {
        // No se encontró ningún registro
        console.warn('[getProfile] No se encontró perfil (PGRST116) para usuario:', userId);
        console.warn('[getProfile] Esto significa que el usuario no tiene registro en user_profiles');
        return null;
      }
      
      // Error de permisos RLS
      if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('RLS')) {
        console.error('[getProfile] Error de permisos RLS:', error);
        console.error('[getProfile] Las políticas RLS pueden estar bloqueando el acceso a user_profiles');
      } else {
        console.error('[getProfile] Error obteniendo perfil:', error);
        console.error('[getProfile] Código:', error.code, 'Mensaje:', error.message);
      }
      return null;
    }

    if (!data) {
      console.warn('[getProfile] No se recibieron datos para usuario:', userId);
      return null;
    }

    console.log('[getProfile] Perfil encontrado:', { role: data.role, barbershop_id: data.barbershop_id });
    return {
      role: data.role as Role,
      barbershopId: data.barbershop_id,
    };
  } catch (err: any) {
    console.error('[getProfile] Excepción al obtener perfil:', err);
    console.error('[getProfile] Tipo de error:', err?.constructor?.name);
    return null;
  }
}

export async function getBarbershop(barbershopId: string) {
  // Optimizado: solo seleccionar campos necesarios y usar límite
  const { data, error } = await supabase
    .from('barbershops')
    .select('id, name, owner_user_id, num_barbers')
    .eq('id', barbershopId)
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    ownerUserId: data.owner_user_id,
    numBarbers: data.num_barbers,
  };
}

// ============================================
// SERVICIOS
// ============================================

export async function listServices(barbershopId: string, barberUserId?: string): Promise<ServiceRecord[]> {
  let query = supabase
    .from('services')
    .select('id, barbershop_id, barber_user_id, user_id, name, price, timestamp')
    .eq('barbershop_id', barbershopId)
    .order('timestamp', { ascending: false });

  // Si se especifica un barbero, filtrar solo sus servicios
  // (aunque las políticas RLS ya lo hacen automáticamente)
  if (barberUserId) {
    query = query.eq('barber_user_id', barberUserId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((s) => ({
    id: s.id,
    barbershopId: s.barbershop_id,
    barberUserId: s.barber_user_id || s.user_id || '',
    user_id: s.user_id,
    name: s.name,
    price: s.price,
    timestamp: s.timestamp,
  }));
}

export async function addService(
  record: Omit<ServiceRecord, 'id' | 'timestamp'> & { timestamp?: string }
) {
  // Validar que los campos requeridos estén presentes
  if (!record.barbershopId) {
    throw new Error('barbershopId es requerido');
  }
  if (!record.barberUserId) {
    throw new Error('barberUserId es requerido');
  }
  if (!record.name) {
    throw new Error('El nombre del servicio es requerido');
  }
  if (!record.price || record.price <= 0) {
    throw new Error('El precio del servicio debe ser mayor a 0');
  }

  console.log('[addService] Insertando servicio:', {
    barbershop_id: record.barbershopId,
    barber_user_id: record.barberUserId,
    user_id: record.user_id || record.barberUserId,
    name: record.name,
    price: record.price,
  });

  const { data, error } = await supabase
    .from('services')
    .insert({
      user_id: record.user_id || record.barberUserId,
      barbershop_id: record.barbershopId,
      barber_user_id: record.barberUserId,
      name: record.name,
      price: record.price,
      timestamp: record.timestamp || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[addService] Error de Supabase:', error);
    
    // Mensajes de error más descriptivos
    if (error.code === '42501' || error.message.includes('policy') || error.message.includes('RLS')) {
      throw new Error(`Error de permisos: No tienes permiso para agregar servicios en esta barbería. Verifica que tu perfil esté correctamente configurado. Código: ${error.code}`);
    } else if (error.code === '23503') {
      throw new Error(`Error de referencia: El barbero o la barbería especificados no existen. Código: ${error.code}`);
    } else if (error.code === '23505') {
      throw new Error(`Error: Ya existe un servicio con estos datos. Código: ${error.code}`);
    } else {
      throw new Error(`Error al agregar servicio: ${error.message || 'Error desconocido'} (Código: ${error.code || 'N/A'})`);
    }
  }

  if (!data) {
    throw new Error('No se recibieron datos al crear el servicio');
  }

  console.log('[addService] Servicio creado exitosamente:', data);

  return {
    id: data.id,
    barbershopId: data.barbershop_id,
    barberUserId: data.barber_user_id || data.user_id || '',
    user_id: data.user_id,
    name: data.name,
    price: data.price,
    timestamp: data.timestamp,
  };
}

export async function deleteService(serviceId: string, requesterUserId: string) {
  const { error } = await supabase.from('services').delete().eq('id', serviceId);

  if (error) throw new Error('No autorizado a eliminar este servicio');
}

// ============================================
// TIPOS DE SERVICIO (localStorage por ahora)
// ============================================

export interface ServiceType {
  name: string;
  price: number;
  icon: string;
}

const DEFAULT_SERVICE_TYPES: ServiceType[] = [
  { name: 'Corte', price: 6500, icon: '✂️' },
  { name: 'Corte y perfilado', price: 7000, icon: '✂️✨' },
  { name: 'Corte y barba', price: 7500, icon: '✂️🧔' },
  { name: 'Corte barba y perfilado', price: 8000, icon: '✂️🧔✨' },
  { name: 'Barba', price: 3000, icon: '🧔' },
];

const LS_SERVICE_TYPES = 'mock_service_types';

export async function getServiceTypes(): Promise<ServiceType[]> {
  try {
    const raw = localStorage.getItem(LS_SERVICE_TYPES);
    if (raw) {
      return JSON.parse(raw);
    }
    localStorage.setItem(LS_SERVICE_TYPES, JSON.stringify(DEFAULT_SERVICE_TYPES));
    return DEFAULT_SERVICE_TYPES;
  } catch {
    return DEFAULT_SERVICE_TYPES;
  }
}

export async function setServiceTypes(serviceTypes: ServiceType[]) {
  localStorage.setItem(LS_SERVICE_TYPES, JSON.stringify(serviceTypes));
}

// ============================================
// GESTIÓN DE BARBEROS
// ============================================

export async function createBarber(email: string, password: string, barbershopId: string) {
  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
      throw new Error('El email ya está registrado');
    }
    throw new Error(authError.message);
  }

  if (!authData.user) throw new Error('Error creando usuario');

  // Crear perfil de barbero
  const { error } = await supabase.from('user_profiles').insert({
    user_id: authData.user.id,
    role: 'barber',
    barbershop_id: barbershopId,
  });

  if (error) {
    throw new Error(`Error creando perfil: ${error.message}`);
  }

  return {
    id: authData.user.id,
    email: authData.user.email || email,
    role: 'barber' as Role,
    barbershopId,
  };
}

export async function listBarbers(barbershopId: string): Promise<UserLite[]> {
  // Usar la función SQL para obtener barberos con emails
  const { data, error } = await supabase.rpc('get_barbers_with_emails', {
    p_barbershop_id: barbershopId,
  });

  if (error) {
    // Fallback: obtener solo perfiles si la función no existe aún
    const { data: profilesData, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, role, barbershop_id')
      .eq('barbershop_id', barbershopId)
      .eq('role', 'barber');

    if (profileError) throw profileError;

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    return (profilesData || []).map((p) => ({
      id: p.user_id,
      email: p.user_id === currentUser?.id ? (currentUser.email || '') : p.user_id.substring(0, 8) + '...',
      role: 'barber' as Role,
      barbershopId: p.barbershop_id,
    }));
  }

  return (data || []).map((b) => ({
    id: b.id,
    email: b.email || '',
    role: b.role as Role,
    barbershopId: b.barbershop_id,
  }));
}

// Generar contraseña temporal aleatoria
function generateTempPassword(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Invitaciones (simplificado - usar creación directa de barberos)
export async function createInvite(email: string, barbershopId: string) {
  const tempPassword = generateTempPassword();
  // Crear el barbero directamente
  await createBarber(email, tempPassword, barbershopId);
  const link = `${window.location.origin}/?invite=${tempPassword}`;
  return { token: tempPassword, link, qrDataUrl: '', email, password: tempPassword };
}

export async function acceptInvite(token: string, password: string) {
  // Las invitaciones ahora se manejan directamente con createBarber
  throw new Error('Usa createBarber en su lugar');
}

// Roles
export async function updateRole(barberId: string, role: Role) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('user_id', barberId);

  if (error) throw new Error('Usuario no encontrado');
  
  const profile = await getProfile(barberId);
  if (!profile) throw new Error('Perfil no encontrado');
  
  return {
    id: barberId,
    email: '',
    role: profile.role as Role,
    barbershopId: profile.barbershopId,
  };
}

// Horarios (no implementado aún en BD)
export async function setSchedule(
  barberId: string,
  schedule: { [weekday: number]: Array<{ start: string; end: string }> }
) {
  // TODO: Implementar tabla de horarios
  console.log('setSchedule not implemented yet', barberId, schedule);
}

// Metas (no implementado aún en BD)
export async function setGoals(
  barberId: string,
  goals: {
    weekly?: { targetServices?: number; targetRevenue?: number };
    monthly?: { targetServices?: number; targetRevenue?: number };
  }
) {
  // TODO: Implementar tabla de metas
  console.log('setGoals not implemented yet', barberId, goals);
}

// Ranking
export async function getRanking(barbershopId: string, period: 'day' | '7d' | 'month') {
  const barbers = await listBarbers(barbershopId);
  const services = await listServices(barbershopId);
  const now = new Date();
  let start = new Date(now);
  
  if (period === 'day') {
    start.setHours(0, 0, 0, 0);
  } else if (period === '7d') {
    start.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const within = services.filter((s) => new Date(s.timestamp) >= start);
  const byBarber: Record<string, { services: number; revenue: number }> = {};
  
  for (const s of within) {
    const key = s.barberUserId;
    if (!byBarber[key]) byBarber[key] = { services: 0, revenue: 0 };
    byBarber[key].services += 1;
    byBarber[key].revenue += s.price;
  }
  
  const rows = barbers.map((b) => ({
    id: b.id,
    email: b.email,
    services: byBarber[b.id]?.services || 0,
    revenue: byBarber[b.id]?.revenue || 0,
  }));
  
  rows.sort((a, b) => b.revenue - a.revenue || b.services - a.services);
  return rows;
}

export async function updateBarber(barberId: string, update: { email?: string; password?: string }) {
  if (update.password) {
    // Actualizar contraseña requiere acceso admin de Supabase
    // Por ahora, no lo implementamos
    throw new Error('Actualizar contraseña requiere configuración adicional');
  }

  if (update.email) {
    // Actualizar email requiere acceso admin
    throw new Error('Actualizar email requiere configuración adicional');
  }

  const profile = await getProfile(barberId);
  if (!profile) throw new Error('Barbero no encontrado');

  return {
    id: barberId,
    email: '',
    role: profile.role as Role,
    barbershopId: profile.barbershopId,
  };
}

export async function deleteBarber(barberId: string, opts?: { removeServices?: boolean }) {
  const removeServices = opts?.removeServices !== false;

  if (removeServices) {
    const { error: servicesError } = await supabase
      .from('services')
      .delete()
      .eq('barber_user_id', barberId);
    
    if (servicesError) {
      throw new Error(`Error eliminando servicios: ${servicesError.message}`);
    }
  }

  // Eliminar perfil
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('user_id', barberId);

  if (profileError) {
    throw new Error(`Error eliminando perfil: ${profileError.message}`);
  }

  // Nota: Eliminar el usuario de auth.users requiere permisos admin o usar Admin API
  // Por ahora, solo eliminamos el perfil. El usuario quedará en auth.users pero sin acceso
}
