import { supabase } from './supabase';

export type Role = 'admin' | 'barber';

export interface UserLite {
  id: string;
  email: string;
  role: Role;
  barbershopId: string;
}

export interface ServiceRecord {
  id: string;
  barbershopId: string;
  barberUserId: string;
  user_id?: string;
  name: string;
  price: number;
  timestamp: string;
}

// ============================================
// AUTENTICACIÓN - VERSIÓN SIMPLIFICADA
// ============================================

export async function signUp(email: string, password: string, barbershopName: string) {
  console.log('[signUp] === INICIO REGISTRO ===');
  
  // Validar
  if (!email || !email.includes('@')) throw new Error('Email inválido');
  if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
  if (!barbershopName?.trim()) throw new Error('El nombre de la barbería es requerido');

  // Crear usuario (sin verificación de email)
  console.log('[signUp] Creando usuario en Supabase Auth...');
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim(),
    password: password.trim(),
    options: {
      emailRedirectTo: undefined,
      data: {
        barbershop_name: barbershopName.trim(),
      },
    },
  });

  if (authError) {
    console.error('[signUp] Error en signUp:', authError);
    if (authError.message?.includes('already registered')) {
      throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
    }
    throw new Error(authError.message || 'Error creando usuario');
  }

  if (!authData.user) {
    throw new Error('No se pudo crear el usuario');
  }

  const userId = authData.user.id;
  console.log('[signUp] Usuario creado con ID:', userId);

  // Crear barbería y perfil usando función RPC (SIEMPRE intentar primero)
  console.log('[signUp] Creando barbería y perfil con función RPC...');
  const { data: barbershopId, error: rpcError } = await supabase.rpc(
    'create_barbershop_on_signup',
    {
      p_user_id: userId,
      p_barbershop_name: barbershopName.trim(),
      p_num_barbers: 1,
    }
  );

  if (rpcError) {
    console.error('[signUp] Error en RPC:', rpcError);
    throw new Error(`Error creando barbería: ${rpcError.message}. Verifica que la función create_barbershop_on_signup existe en Supabase.`);
  }

  if (!barbershopId) {
    throw new Error('Error: No se recibió el ID de la barbería');
  }

  console.log('[signUp] Barbería creada con ID:', barbershopId);

  // Obtener datos completos de la barbería
  const { data: shopData, error: fetchError } = await supabase
    .from('barbershops')
    .select('id, name, owner_user_id, num_barbers')
    .eq('id', barbershopId)
    .single();

  if (fetchError || !shopData) {
    console.error('[signUp] Error obteniendo datos:', fetchError);
    throw new Error('Error obteniendo datos de la barbería');
  }

  console.log('[signUp] === REGISTRO COMPLETADO ===');
  
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

export async function signInWithPassword({ email, password }: { email: string; password: string }) {
  console.log('[signIn] === INICIO LOGIN ===');
  console.log('[signIn] Email:', email);
  
  // Validar
  if (!email || !email.includes('@')) throw new Error('Email inválido');
  if (!password) throw new Error('La contraseña es requerida');

  // Paso 1: Autenticar con Supabase
  console.log('[signIn] Autenticando...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password.trim(),
  });

  if (error) {
    console.error('[signIn] ❌ Error de autenticación:', error);
    console.error('[signIn] Código de error:', error.status || error.code);
    console.error('[signIn] Mensaje:', error.message);
    
    // Verificar si es un error 400 (Bad Request)
    if (error.status === 400 || error.message?.includes('400')) {
      console.error('[signIn] ⚠️ ERROR 400 - Posibles causas:');
      console.error('  1. Variables de entorno incorrectas en Netlify');
      console.error('  2. URL de Supabase apunta a otro proyecto');
      console.error('  3. Anon Key incorrecta');
      console.error('  4. Email/contraseña incorrectos');
      console.error('[signIn] Verifica en la consola el diagnóstico de [Supabase Config]');
    }
    
    if (error.message?.includes('Invalid login') || error.message?.includes('invalid')) {
      throw new Error('Email o contraseña incorrectos.\n\n' +
        'Si funciona localmente pero no en Netlify:\n' +
        '• Verifica que las variables de entorno en Netlify sean correctas\n' +
        '• Verifica que la URL de Supabase apunte al mismo proyecto\n' +
        '• Revisa la consola para ver el diagnóstico de configuración');
    }
    throw new Error(error.message || 'Error al iniciar sesión');
  }

  if (!data?.user) {
    throw new Error('No se recibió información del usuario');
  }

  console.log('[signIn] Usuario autenticado:', data.user.id);

  // Paso 2: Obtener perfil (sin complicaciones)
  console.log('[signIn] Obteniendo perfil...');
  const profile = await getProfile(data.user.id);
  
  if (!profile) {
    console.error('[signIn] ❌ Perfil no encontrado para usuario:', data.user.id);
    console.error('[signIn] Esto puede ser por:');
    console.error('  1. El perfil no existe en la base de datos');
    console.error('  2. Las políticas RLS están bloqueando el acceso');
    console.error('  3. El usuario no está asociado a una barbería');
    
    // Paso 1: Intentar verificar si el perfil existe pero RLS lo bloquea
    // Intentar leer directamente como admin (si es posible)
    console.log('[signIn] Intentando verificar existencia del perfil...');
    const { data: profileCheck, error: checkError } = await supabase
      .from('user_profiles')
      .select('user_id, role, barbershop_id')
      .eq('user_id', data.user.id)
      .maybeSingle();
    
    if (checkError) {
      console.error('[signIn] Error verificando perfil:', checkError);
      if (checkError.code === '42501' || checkError.message?.includes('policy')) {
        console.error('[signIn] ⚠️ RLS está bloqueando - El perfil puede existir pero no se puede leer');
        console.error('[signIn] Verifica la política "Users can view own profile" en Supabase');
      }
    } else if (profileCheck) {
      console.error('[signIn] ⚠️ PERFIL EXISTE pero getProfile no lo encontró - problema de RLS');
      console.error('[signIn] Perfil encontrado:', profileCheck);
    }
    
    // Paso 2: Intentar completar registro automáticamente si tiene metadata
    const userMetadata = data.user.user_metadata;
    const barbershopName = userMetadata?.barbershop_name;
    
    if (barbershopName) {
      console.log('[signIn] Intentando completar registro automáticamente con metadata...');
      try {
        const { data: barbershopId, error: rpcError } = await supabase.rpc(
          'create_barbershop_on_signup',
          {
            p_user_id: data.user.id,
            p_barbershop_name: barbershopName,
            p_num_barbers: 1,
          }
        );
        
        if (!rpcError && barbershopId) {
          console.log('[signIn] ✅ Registro completado automáticamente');
          // Esperar un momento para que se propague
          await new Promise(resolve => setTimeout(resolve, 500));
          const newProfile = await getProfile(data.user.id);
          if (newProfile) {
            console.log('[signIn] === LOGIN EXITOSO ===');
            return {
              user: {
                id: data.user.id,
                email: data.user.email || email,
                role: newProfile.role,
                barbershopId: newProfile.barbershopId,
              },
            };
          }
        } else {
          console.error('[signIn] Error completando registro:', rpcError);
        }
      } catch (completeErr) {
        console.error('[signIn] Excepción al completar registro:', completeErr);
      }
    }
    
    // Paso 3: Intentar buscar si tiene barbería existente
    console.log('[signIn] Buscando barberías existentes...');
    const { data: existingShops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_user_id', data.user.id)
      .limit(1);
    
    if (!shopsError && existingShops && existingShops.length > 0) {
      console.log('[signIn] Barbería existente encontrada:', existingShops[0]);
      // Intentar crear perfil manualmente
      const { error: profileInsertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          role: 'admin',
          barbershop_id: existingShops[0].id,
        });
      
      if (!profileInsertError) {
        console.log('[signIn] ✅ Perfil creado manualmente');
        await new Promise(resolve => setTimeout(resolve, 500));
        const newProfile = await getProfile(data.user.id);
        if (newProfile) {
          return {
            user: {
              id: data.user.id,
              email: data.user.email || email,
              role: newProfile.role,
              barbershopId: newProfile.barbershopId,
            },
          };
        }
      } else {
        console.error('[signIn] Error creando perfil manualmente:', profileInsertError);
      }
    }
    
    // Si llegamos aquí, no se pudo arreglar automáticamente
    console.error('[signIn] ❌ No se pudo arreglar el perfil automáticamente');
    throw new Error(
      'Tu cuenta no tiene un perfil configurado.\n\n' +
      'SOLUCIÓN:\n' +
      '1. Abre Supabase SQL Editor\n' +
      '2. Ejecuta el script ARREGLAR_USUARIOS_EXISTENTES.sql con tu email\n' +
      '3. O ejecuta este SQL directo:\n' +
      `   SELECT public.create_barbershop_on_signup('${data.user.id}', 'Mi Barbería', 1);`
    );
  }

  console.log('[signIn] ✅ Perfil encontrado');
  console.log('[signIn] === LOGIN EXITOSO ===');
  
  return {
    user: {
      id: data.user.id,
      email: data.user.email || email,
      role: profile.role,
      barbershopId: profile.barbershopId,
    },
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      return { data: { session: null } };
    }

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
            role: profile.role,
            barbershopId: profile.barbershopId,
          },
        },
      },
    };
  } catch {
    return { data: { session: null } };
  }
}

export function onAuthStateChange(
  cb: (event: 'SIGNED_IN' | 'SIGNED_OUT', session: { user: UserLite } | null) => void
) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
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
          role: profile.role,
          barbershopId: profile.barbershopId,
        },
      });
    } catch {
      cb('SIGNED_OUT', null);
    }
  });
}

export async function getProfile(userId: string) {
  console.log('[getProfile] === INICIO ===');
  console.log('[getProfile] Buscando perfil para userId:', userId);
  
  // Timeout de seguridad: 5 segundos máximo
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.error('[getProfile] ⏱️ TIMEOUT después de 5 segundos - La query está tardando demasiado');
      resolve(null);
    }, 5000);
  });

  const queryPromise = (async () => {
    try {
      console.log('[getProfile] Ejecutando query a Supabase...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role, barbershop_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[getProfile] ❌ Error de Supabase:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        // Si es error de "no encontrado", es normal
        if (error.code === 'PGRST116') {
          console.log('[getProfile] Perfil no encontrado (normal - código PGRST116)');
          return null;
        }
        
        // Si es error de permisos RLS
        if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission')) {
          console.error('[getProfile] ❌ ERROR DE PERMISOS RLS');
          console.error('[getProfile] La política "Users can view own profile" puede estar mal configurada');
          console.error('[getProfile] Ejecuta SUPABASE_TODO_EN_UNO.sql nuevamente para recrear las políticas');
        }
        
        return null;
      }

      console.log('[getProfile] Respuesta recibida de Supabase');
      console.log('[getProfile] Datos recibidos:', data);

      if (!data) {
        console.log('[getProfile] No hay datos (perfil no existe en la base de datos)');
        return null;
      }

      if (!data.role || !data.barbershop_id) {
        console.error('[getProfile] ❌ Datos incompletos:', {
          role: data.role,
          barbershop_id: data.barbershop_id,
        });
        return null;
      }

      console.log('[getProfile] ✅ Perfil encontrado:', {
        role: data.role,
        barbershopId: data.barbershop_id,
      });
      console.log('[getProfile] === FIN ===');
      
      return {
        role: data.role as Role,
        barbershopId: data.barbershop_id,
      };
    } catch (err: any) {
      console.error('[getProfile] ❌ Excepción en query:', err);
      return null;
    }
  })();

  // Usar Promise.race para timeout
  return Promise.race([queryPromise, timeoutPromise]);
}

export async function getBarbershop(barbershopId: string) {
  const { data, error } = await supabase
    .from('barbershops')
    .select('id, name, owner_user_id, num_barbers')
    .eq('id', barbershopId)
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

export async function addService(record: {
  user_id: string;
  barberUserId: string;
  barbershopId: string;
  name: string;
  price: number;
}): Promise<ServiceRecord> {
  if (!record.barbershopId) throw new Error('barbershopId es requerido');
  if (!record.barberUserId) throw new Error('barberUserId es requerido');
  if (!record.name?.trim()) throw new Error('El nombre del servicio es requerido');
  if (!record.price || record.price <= 0) throw new Error('El precio debe ser mayor a 0');

  const { data, error } = await supabase
    .from('services')
    .insert({
      user_id: record.user_id,
      barbershop_id: record.barbershopId,
      barber_user_id: record.barberUserId,
      name: record.name.trim(),
      price: record.price,
    })
    .select()
    .single();

  if (error) {
    console.error('[addService] Error:', error);
    throw new Error(error.message || 'Error agregando servicio');
  }

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
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (error) throw new Error('No autorizado a eliminar este servicio');
}

// ============================================
// BARBEROS
// ============================================

export interface Barber {
  id: string;
  email: string;
  role: Role;
  barbershopId: string;
}

export async function listBarbers(barbershopId: string): Promise<Barber[]> {
  const { data, error } = await supabase.rpc('get_barbers_with_emails', {
    p_barbershop_id: barbershopId,
  });

  if (error) {
    console.error('[listBarbers] Error:', error);
    return [];
  }

  return (data || []).map((b: any) => ({
    id: b.id,
    email: b.email,
    role: 'barber' as Role,
    barbershopId: b.barbershop_id,
  }));
}

export async function createBarber(
  email: string,
  password: string,
  barbershopId: string
): Promise<Barber> {
  // Crear usuario
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    throw new Error(authError.message || 'Error creando barbero');
  }

  if (!authData.user) {
    throw new Error('No se pudo crear el usuario');
  }

  // Crear perfil
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: authData.user.id,
      role: 'barber',
      barbershop_id: barbershopId,
    });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message || 'Error creando perfil');
  }

  return {
    id: authData.user.id,
    email: authData.user.email || email,
    role: 'barber',
    barbershopId,
  };
}

export async function updateRole(barberId: string, newRole: Role, barbershopId: string) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ role: newRole })
    .eq('user_id', barberId)
    .eq('barbershop_id', barbershopId);

  if (error) throw error;
}

export async function deleteBarber(barberId: string, barbershopId: string) {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('user_id', barberId)
    .eq('barbershop_id', barbershopId);

  if (error) throw error;

  await supabase.auth.admin.deleteUser(barberId);
}

export async function updateBarber(barberId: string, update: { email?: string; password?: string }) {
  if (update.email) {
    const { error } = await supabase.auth.admin.updateUserById(barberId, {
      email: update.email,
    });
    if (error) throw error;
  }

  if (update.password) {
    const { error } = await supabase.auth.admin.updateUserById(barberId, {
      password: update.password,
    });
    if (error) throw error;
  }
}

// ============================================
// INVITACIONES (Simplificado)
// ============================================

export async function createInvite(email: string, barbershopId: string) {
  // Simplemente crear barbero directamente
  const barber = await createBarber(email, Math.random().toString(36).slice(-8), barbershopId);
  return {
    link: `${window.location.origin}`,
    email: barber.email,
    password: Math.random().toString(36).slice(-8),
  };
}

export async function acceptInvite(inviteToken: string) {
  throw new Error('Las invitaciones ahora se manejan directamente con createBarber');
}

// ============================================
// TIPOS DE SERVICIO (localStorage)
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
// METAS Y RANKING (Simplificado)
// ============================================

export async function setSchedule(
  barberId: string,
  schedule: { [weekday: number]: Array<{ start: string; end: string }> }
) {
  console.log('setSchedule not implemented yet', barberId, schedule);
}

export async function setGoals(
  barberId: string,
  goals: {
    weekly?: { targetServices?: number; targetRevenue?: number };
    monthly?: { targetServices?: number; targetRevenue?: number };
  }
) {
  console.log('setGoals not implemented yet', barberId, goals);
}

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
