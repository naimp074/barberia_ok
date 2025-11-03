import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserLite } from '../lib/data';
import * as data from '../lib/data';

interface AuthContextType {
  user: UserLite | null;
  loading: boolean;
  role: 'admin' | 'barber' | null;
  barbershop: { id: string; name: string } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'barber' | null>(null);
  const [barbershop, setBarbershop] = useState<{ id: string; name: string } | null>(null);

  const loadProfile = async (userId: string, loadShopData = true) => {
    try {
      const profile = await data.getProfile(userId);
      if (!profile) {
        setRole(null);
        setBarbershop(null);
        return;
      }

      // Establecer rol inmediatamente (más importante para el login)
      setRole(profile.role);

      // Cargar datos de barbería en segundo plano si se solicita (no bloquea el login)
      if (loadShopData) {
        const shop = await data.getBarbershop(profile.barbershopId);
        if (shop) {
          setBarbershop({ id: shop.id, name: shop.name });
        } else {
          setBarbershop(null);
        }
      }
    } catch (e) {
      console.error(e);
      setRole(null);
      setBarbershop(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Timeout de seguridad: 3 segundos máximo
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthContext] Loading timeout, forcing loading to false');
        setLoading(false);
      }
    }, 3000);

    // Obtener sesión inicial con manejo de errores
    data.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        
        try {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            // Cargar perfil rápidamente (sin esperar datos de barbería)
            try {
              await loadProfile(currentUser.id, true);
            } catch (profileError) {
              console.error('[AuthContext] Error loading profile:', profileError);
              // Continuar aunque falle el perfil
            }
          } else {
            // No hay usuario, asegurar que todo está limpio
            setRole(null);
            setBarbershop(null);
          }
        } catch (error) {
          console.error('[AuthContext] Error in getSession callback:', error);
        } finally {
          if (mounted) {
            clearTimeout(timeoutId);
            setLoading(false);
          }
        }
      })
      .catch((error) => {
        console.error('[AuthContext] Error getting session:', error);
        if (mounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      });

    // Suscribirse a cambios de autenticación
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      const authSub = data.onAuthStateChange((event, session) => {
        if (!mounted) return;
        
        (async () => {
          try {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
              // Cargar perfil sin bloquear (datos de barbería se cargan en segundo plano)
              loadProfile(currentUser.id, true).catch(err => 
                console.error('[AuthContext] Error loading profile in auth change:', err)
              );
            } else {
              setRole(null);
              setBarbershop(null);
            }
          } catch (error) {
            console.error('[AuthContext] Error in auth state change:', error);
          }
        })();
      });
      
      subscription = authSub.data?.subscription || null;
    } catch (error) {
      console.error('[AuthContext] Error setting up auth listener:', error);
      // Si falla el listener, aún así debemos quitar el loading
      if (mounted) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    await data.signOut();
    setUser(null);
    setRole(null);
    setBarbershop(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, barbershop, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// loadProfile definido dentro del provider
