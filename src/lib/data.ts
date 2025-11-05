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
// AUTENTICACIÓN - VERSIÓN SIMPLIFICADA Y ROBUSTA
// ============================================

export async function signUp(email: string, password: string, barbershopName: string) {
  console.log('[signUp] === INICIO REGISTRO ===');
  
  // Validar
  if (!email || !email.includes('@')) throw new Error('Email inválido');
  if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
  if (!barbershopName?.trim()) throw new Error('El nombre de la barbería es requerido');

  try {
    // Paso 1: Crear usuario en Supabase Auth
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
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
      }
      throw new Error(authError.message || 'Error creando usuario');
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario');
    }

    const userId = authData.user.id;
    console.log('[signUp] Usuario creado con ID:', userId);

    // Paso 2: Crear barbería y perfil usando función RPC
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

    // Paso 3: Intentar obtener datos de la barbería (con fallback si falla)
    let shopData: any = {
      id: barbershopId,
      name: barbershopName.trim(),
      owner_user_id: userId,
      num_barbers: 1,
    };

    try {
      const { data: fetchedData } = await supabase
        .from('barbershops')
        .select('id, name, owner_user_id, num_barbers')
        .eq('id', barbershopId)
        .maybeSingle();
      
      if (fetchedData) {
        shopData = fetchedData;
        console.log('[signUp] Datos de barbería obtenidos correctamente');
      }
    } catch (fetchErr) {
      console.warn('[signUp] No se pudieron obtener datos de barbería, usando datos conocidos');
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
        numBarbers: shopData.num_barbers || 1,
      },
    };
  } catch (error: any) {
    console.error('[signUp] Error completo:', error);
    throw error;
  }
}

export async function signInWithPassword({ email, password }: { email: string; password: string }) {
  console.log('[signIn] === INICIO LOGIN ===');
  console.log('[signIn] Email:', email);
  
  // Validar
  if (!email || !email.includes('@')) throw new Error('Email inválido');
  if (!password) throw new Error('La contraseña es requerida');

  try {
    // Paso 1: Autenticar con Supabase
    console.log('[signIn] Autenticando con Supabase...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      console.error('[signIn] ❌ Error de autenticación:', error);
      
      if (error.message?.includes('Invalid login') || error.message?.includes('invalid')) {
        throw new Error('Email o contraseña incorrectos');
      }
      throw new Error(error.message || 'Error al iniciar sesión');
    }

    if (!data?.user) {
      throw new Error('No se recibió información del usuario');
    }

    console.log('[signIn] ✅ Usuario autenticado:', data.user.id);

    // Paso 2: Obtener perfil (simplificado)
    console.log('[signIn] Obteniendo perfil...');
    const profile = await getProfile(data.user.id);
    
    if (!profile) {
      console.error('[signIn] ❌ Perfil no encontrado');
      throw new Error(
        'Tu cuenta no tiene un perfil configurado.\n\n' +
        'Ejecuta ARREGLAR_PERFIL_RAPIDO.sql en Supabase SQL Editor con tu email.'
      );
    }

    console.log('[signIn] ✅ Perfil encontrado:', profile);
    console.log('[signIn] === LOGIN EXITOSO ===');
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email || email,
        role: profile.role,
        barbershopId: profile.barbershopId,
      },
    };
  } catch (error: any) {
    console.error('[signIn] Error completo:', error);
    throw error;
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[getSession] Error:', error);
      return { data: { session: null } };
    }
    return { data: { session: data.session } };
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
  console.log('[getProfile] Buscando perfil para userId:', userId);
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, barbershop_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[getProfile] Error:', error);
      
      // Si es error de "no encontrado", es normal
      if (error.code === 'PGRST116') {
        return null;
      }
      
      // Si es error de permisos RLS
      if (error.code === '42501' || error.message?.includes('policy')) {
        console.error('[getProfile] ❌ ERROR DE PERMISOS RLS');
        console.error('[getProfile] Ejecuta SUPABASE_TODO_EN_UNO.sql para recrear las políticas');
      }
      
      return null;
    }

    if (!data) {
      return null;
    }

    if (!data.role || !data.barbershop_id) {
      console.error('[getProfile] Datos incompletos:', data);
      return null;
    }

    console.log('[getProfile] ✅ Perfil encontrado:', { role: data.role, barbershopId: data.barbershop_id });
    
    return {
      role: data.role as Role,
      barbershopId: data.barbershop_id,
    };
  } catch (err: any) {
    console.error('[getProfile] Excepción:', err);
    return null;
  }
}

export async function getBarbershop(barbershopId: string) {
  const { data, error } = await supabase
    .from('barbershops')
    .select('id, name, owner_user_id, num_barbers')
    .eq('id', barbershopId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

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

export async function addService(
  barbershopId: string,
  barberUserId: string,
  name: string,
  price: number
): Promise<ServiceRecord> {
  // Validar
  if (!barbershopId) throw new Error('barbershopId es requerido');
  if (!barberUserId) throw new Error('barberUserId es requerido');
  if (!name?.trim()) throw new Error('El nombre del servicio es requerido');
  if (!price || price <= 0) throw new Error('El precio debe ser mayor a 0');

  const { data, error } = await supabase
    .from('services')
    .insert({
      barbershop_id: barbershopId,
      barber_user_id: barberUserId,
      name: name.trim(),
      price,
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[addService] Error:', error);
    if (error.code === '42501') {
      throw new Error('No tienes permisos para agregar servicios. Verifica tu rol.');
    }
    if (error.code === '23503') {
      throw new Error('Error: La barbería o el barbero no existe.');
    }
    throw new Error(error.message || 'Error agregando servicio');
  }

  if (!data) {
    throw new Error('No se recibieron datos del servicio creado');
  }

  return {
    id: data.id,
    barbershopId: data.barbershop_id,
    barberUserId: data.barber_user_id,
    name: data.name,
    price: data.price,
    timestamp: data.timestamp,
  };
}

export async function listServices(
  barbershopId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ServiceRecord[]> {
  let query = supabase
    .from('services')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .order('timestamp', { ascending: false });

  if (startDate) {
    query = query.gte('timestamp', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('timestamp', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('[listServices] Error:', error);
    throw new Error(error.message || 'Error listando servicios');
  }

  return (data || []).map((s: any) => ({
    id: s.id,
    barbershopId: s.barbershop_id,
    barberUserId: s.barber_user_id,
    name: s.name,
    price: s.price,
    timestamp: s.timestamp,
  }));
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
    throw new Error(error.message || 'Error listando barberos');
  }

  return (data || []).map(
    (b: any) => ({
      id: b.user_id,
      email: b.email,
      role: 'barber' as Role,
      barbershopId: b.barbershop_id,
    })
  );
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

  if (error) {
    throw new Error(error.message || 'Error actualizando rol');
  }
}

export async function deleteBarber(barberId: string, barbershopId: string) {
  // Primero eliminar el perfil
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('user_id', barberId)
    .eq('barbershop_id', barbershopId);

  if (profileError) {
    throw new Error(profileError.message || 'Error eliminando perfil');
  }

  // Luego eliminar el usuario (requiere admin)
  try {
    await supabase.auth.admin.deleteUser(barberId);
  } catch (deleteError) {
    console.warn('[deleteBarber] No se pudo eliminar el usuario de auth (puede requerir permisos admin):', deleteError);
  }
}

// ============================================
// INVITACIONES
// ============================================

export async function createInvite(email: string, barbershopId: string) {
  const password = Math.random().toString(36).slice(-8);
  const inviteCode = Math.random().toString(36).slice(-8);
  
  const { data, error } = await supabase
    .from('invites')
    .insert({
      email,
      barbershop_id: barbershopId,
      password,
      invite_code: inviteCode,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Error creando invitación');
  }

  const link = `${window.location.origin}/invite/${inviteCode}`;
  return { link, email, password };
}

// ============================================
// META (GOALS, RANKING, ETC)
// ============================================

export async function setGoals(barbershopId: string, monthlyGoal: number) {
  const { error } = await supabase
    .from('barbershops')
    .update({ monthly_goal: monthlyGoal })
    .eq('id', barbershopId);

  if (error) {
    throw new Error(error.message || 'Error guardando metas');
  }
}

export async function getRanking(barbershopId: string, month: number, year: number) {
  const { data, error } = await supabase.rpc('get_barber_ranking', {
    p_barbershop_id: barbershopId,
    p_month: month,
    p_year: year,
  });

  if (error) {
    console.error('[getRanking] Error:', error);
    return [];
  }

  return data || [];
}

export async function getServiceTypes(barbershopId: string) {
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('barbershop_id', barbershopId);

  if (error) {
    console.error('[getServiceTypes] Error:', error);
    return [];
  }

  return data || [];
}

export async function setServiceTypes(barbershopId: string, types: string[]) {
  // Eliminar tipos existentes
  await supabase
    .from('service_types')
    .delete()
    .eq('barbershop_id', barbershopId);

  // Insertar nuevos tipos
  if (types.length > 0) {
    const { error } = await supabase
      .from('service_types')
      .insert(
        types.map((name) => ({
          barbershop_id: barbershopId,
          name: name.trim(),
        }))
      );

    if (error) {
      throw new Error(error.message || 'Error guardando tipos de servicio');
    }
  }
}
