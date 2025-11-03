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

  const loadProfile = async (userId: string) => {
    try {
      const profile = await data.getProfile(userId);
      if (!profile) {
        setRole(null);
        setBarbershop(null);
        return;
      }

      const shop = await data.getBarbershop(profile.barbershopId);
      if (!shop) {
        setRole(null);
        setBarbershop(null);
        return;
      }

      setRole(profile.role);
      setBarbershop({ id: shop.id, name: shop.name });
    } catch (e) {
      console.error(e);
      setRole(null);
      setBarbershop(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Obtener sesión inicial con manejo de errores
    data.getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        
        try {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            await loadProfile(currentUser.id);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        if (mounted) {
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
              await loadProfile(currentUser.id);
            } else {
              setRole(null);
              setBarbershop(null);
            }
          } catch (error) {
            console.error('Error in auth state change:', error);
          }
        })();
      });
      
      subscription = authSub.data?.subscription || null;
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }

    // Timeout de seguridad para evitar loading infinito
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Loading timeout, forcing loading to false');
        setLoading(false);
      }
    }, 5000);

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
