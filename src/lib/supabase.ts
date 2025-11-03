import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback seguro para desarrollo cuando faltan las variables de entorno.
// Permite que la app arranque y muestre el formulario, pero cualquier acción de auth fallará con un mensaje claro.
function createMockSupabase() {
  const notConfigured = () => ({ error: new Error('Supabase no está configurado. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local') });
  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null } as any;
      },
      async getUser() {
        return { data: { user: null }, error: null } as any;
      },
      onAuthStateChange(cb: any) {
        // Llamar inmediatamente con estado de no autenticado
        setTimeout(() => {
          cb('SIGNED_OUT', null);
        }, 0);
        return { 
          data: { 
            subscription: { 
              unsubscribe() {} 
            } 
          } 
        } as any;
      },
      async signInWithPassword() {
        return notConfigured() as any;
      },
      async signUp() {
        return notConfigured() as any;
      },
      async signOut() {
        return { error: null } as any;
      },
    },
    rpc() {
      return notConfigured() as any;
    },
    from() {
      return {
        select: notConfigured,
        insert: notConfigured,
        delete: notConfigured,
        update: notConfigured,
        order: notConfigured,
        eq: notConfigured,
        single: notConfigured,
      } as any;
    },
  } as any;
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createMockSupabase();
